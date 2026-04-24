// ARCHIVO: src/services/odooService.ts
import type { Quote } from '../types';

export interface OdooConfig {
  url: string; db: string; uid: number; apiKey: string;
  email?: string; method?: 'apikey' | 'password';
}

async function callProxy(action: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/odoo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const text = await res.text();
  if (!text) throw new Error('El proxy no respondió');
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Respuesta inválida: ${text.substring(0, 100)}`); }
  if (!data.ok) throw new Error((data.error as string) || 'Error en proxy Odoo');
  return data.result;
}

async function callOdoo(
  model: string, method: string,
  args: unknown[], kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  return callProxy('call_kw', { model, method, args, kwargs });
}

async function findOrCreatePartner(
  name: string, email?: string, phone?: string
): Promise<number> {
  // Buscar contacto existente por nombre
  let found: Array<{ id: number }> = [];
  try {
    const raw = await callOdoo('res.partner', 'search_read',
      [[['name', '=', name]]],
      { fields: ['id', 'name'], limit: 1 }
    );
    if (Array.isArray(raw) && raw.length > 0) found = raw as Array<{ id: number }>;
  } catch { /* si falla la búsqueda, intentamos crear igual */ }

  if (found.length > 0) {
    const id = Number(found[0].id);
    if (id && !isNaN(id)) return id;
  }

  // Crear nuevo contacto
  const result = await callOdoo('res.partner', 'create', [{
    name,
    email:         email  || '',
    phone:         phone  || '',
    is_company:    true,
    customer_rank: 1,
  }]);
  const id = Number(result);
  if (!id || isNaN(id)) {
    throw new Error(
      `Odoo no devolvió un ID válido al crear el contacto.\n` +
      `Respuesta recibida: ${JSON.stringify(result)}\n` +
      `Verifica que ODOO_UID tenga permisos de escritura en res.partner.`
    );
  }
  return id;
}

async function createCRMLead(params: {
  name: string; partnerId: number; revenue: number;
  description: string; folio: string;
}): Promise<number> {
  const result = await callOdoo('crm.lead', 'create', [{
    name:             params.name,
    partner_id:       params.partnerId,
    expected_revenue: params.revenue,
    description:      params.description,
    type:             'opportunity',
    priority:         0,    // 0=Normal — int requerido por XML-RPC
    stage_id:         1,    // Primera etapa del pipeline
    user_id:          1,    // OdooBot como vendedor asignado
    team_id:          14,   // Equipo: Ventas de Proyectos
  }]);

  const id = Number(result);
  if (!id || isNaN(id)) throw new Error(`Odoo devolvió un ID inválido: ${JSON.stringify(result)}`);

  // Crear actividad de seguimiento para el usuario 112 con vencimiento en 3 días
  const deadline = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  })();

  try {
    await callOdoo('crm.lead', 'activity_schedule', [[id]], {
      activity_type_id: 4,   // Tipo "Tarea / To-Do" (estándar Odoo)
      summary:          'Nueva oportunidad creada desde Cotizador Alamex',
      note:             `<p>Oportunidad <strong>${params.folio}</strong> registrada automáticamente desde el Cotizador Alamex. Revisar y dar seguimiento.</p>`,
      user_id:          112, // Usuario responsable de seguimiento
      date_deadline:    deadline,
    });
  } catch (actErr) {
    // La actividad es secundaria — no cancela la creación del lead
    console.warn('[odoo] activity_schedule falló (no crítico):', (actErr as Error).message);
  }

  return id;
}

export async function sendQuoteToOdoo(
  quote: Quote
): Promise<{ leadId: number; partnerId: number }> {
  const total = (quote.price || 0) * quote.quantity;

  const partnerId = await findOrCreatePartner(
    quote.client_name,
    quote.client_email || '',
    quote.client_phone || '',
  );

  const isMR = quote.model === 'MR';
  const extrasArr: string[] = (() => { try { return JSON.parse(quote.cabin_model || '[]'); } catch { return []; } })();
  const EXTRA_LABELS: Record<string, string> = {
    'espejo-trasero':     'Espejo fondo',
    'pasamanos-redondo':  'Pasamanos redondo',
    'pasamanos-cuadrado': 'Pasamanos cuadrado',
  };
  const panPos = ['izquierdo','derecho','fondo'].filter(p => extrasArr.includes(`panoramico-${p}`));
  const panLabel = panPos.length === 3 ? 'Cabina panorámica completa'
    : panPos.length > 0 ? `Panel panorámico (${panPos.join(', ')})` : null;
  const otherExtras = extrasArr.filter(e => !e.startsWith('panoramico-')).map(e => EXTRA_LABELS[e] || e);
  const extrasStr = [...(panLabel ? [panLabel] : []), ...otherExtras].join(', ') || '—';

  const description = [
    '━━ DATOS GENERALES ━━',
    `Folio: ${quote.folio}`,
    `Fecha proyecto: ${quote.project_date || '—'}`,
    `Modelo: ${quote.model} | Uso: ${quote.use_type}`,
    '',
    '━━ ESPECIFICACIONES TÉCNICAS ━━',
    `Capacidad: ${quote.capacity} kg / ${quote.persons} personas`,
    `Paradas: ${quote.stops} | Velocidad: ${quote.speed} m/s`,
    `Recorrido: ${((quote.travel || 0) / 1000).toFixed(1)} m`,
    `Cubo: ${quote.shaft_width} × ${quote.shaft_depth} mm`,
    isMR ? `Fosa: ${quote.pit} mm | Sobrepaso: ${quote.overhead} mm` : '',
    `Normativa: ${quote.norm || 'EN 81-20'}`,
    '',
    '━━ CABINA ━━',
    `Acabado: ${quote.cabin_finish || '—'}`,
    `Piso: ${quote.cabin_floor || '—'}`,
    `Plafón/COP: ${quote.cop_model || '—'}`,
    `Accesorios: ${extrasStr}`,
    '',
    '━━ PUERTAS ━━',
    `Tipo: ${quote.door_type || '—'}`,
    `Dimensiones: ${quote.door_width} × ${quote.door_height} mm`,
    '',
    '━━ CONDICIONES COMERCIALES ━━',
    `Total: $${total.toLocaleString('es-MX')} ${quote.currency || 'MXN'}`,
    `Entrega: ${quote.commercial_terms?.deliveryTime || '—'}`,
    `Garantía: ${quote.commercial_terms?.warranty || '—'}`,
    `Validez: ${quote.commercial_terms?.validity || '—'}`,
    quote.internal_notes ? `\nNotas internas: ${quote.internal_notes}` : '',
  ].filter(l => l !== undefined).join('\n');

  const leadId = await createCRMLead({
    name:      `[${quote.folio}] ${quote.model} - ${quote.client_name}`,
    partnerId,
    revenue:   total,
    description,
    folio:     quote.folio,
  });

  return { leadId, partnerId };
}

export async function testOdooConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await callProxy('test', {});
    return { ok: true, message: 'Conexión exitosa' };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function saveOdooCredentials(): Promise<void> {}
export async function getOdooCredentials(): Promise<OdooConfig | null> { return null; }
export async function authenticateOdoo(): Promise<{ uid: number; name: string }> {
  throw new Error('No aplica');
}
