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
  const found = await callOdoo('res.partner', 'search_read',
    [[['name', '=', name]]],
    { fields: ['id', 'name'], limit: 1 }
  ) as Array<{ id: number }>;
  if (Array.isArray(found) && found.length > 0) return Number(found[0].id);

  const result = await callOdoo('res.partner', 'create', [{
    name,
    email:         email  || '',
    phone:         phone  || '',
    is_company:    true,
    customer_rank: 1,
  }]);
  const id = Number(result);
  if (!id || isNaN(id)) throw new Error(`Error al crear contacto en Odoo: ${JSON.stringify(result)}`);
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
    priority:         0,             // int (no string) — 0=Normal, 1=Baja, 2=Alta, 3=Muy Alta
    stage_id:         1,             // Primera etapa del pipeline (Nuevo / Calificación)
  }]);

  const id = Number(result);
  if (!id || isNaN(id)) throw new Error(`Odoo devolvió un ID inválido: ${JSON.stringify(result)}`);
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
    'espejo-trasero': 'Espejo fondo', 'espejo-lateral': 'Espejo lateral',
    'pasamanos-inox': 'Pasamanos INOX', 'pasamanos-crom': 'Pasamanos cromado',
    'led-premium': 'LED Premium', 'panoramico': 'Panel panorámico',
  };
  const extrasStr = extrasArr.map(e => EXTRA_LABELS[e] || e).join(', ') || '—';

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
