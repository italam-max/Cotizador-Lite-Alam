// ARCHIVO: src/services/odooService.ts
// Llama al API Route /api/odoo (Vercel serverless)
// Sin dependencia de sesión Supabase — las credenciales viven en el servidor.

import type { Quote } from '../types';

export interface OdooConfig {
  url:     string;
  db:      string;
  uid:     number;
  apiKey:  string;
  email?:  string;
  method?: 'apikey' | 'password';
}

// ── Helper: llamar al proxy de Vercel ────────────────────────
async function callProxy(action: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/odoo', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, ...params }),
  });

  const text = await res.text();
  if (!text) throw new Error('El proxy no respondió');

  let data: Record<string, unknown>;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Respuesta inválida del proxy: ${text.substring(0, 100)}`); }

  if (!data.ok) throw new Error((data.error as string) || 'Error en proxy Odoo');
  return data.result;
}

// ── Llamada genérica a Odoo ───────────────────────────────────
async function callOdoo(
  model:  string,
  method: string,
  args:   unknown[] = [],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  return callProxy('call_kw', { model, method, args, kwargs });
}

// ── Buscar o crear cliente (res.partner) ─────────────────────
async function findOrCreatePartner(
  name:   string,
  email?: string,
  phone?: string
): Promise<number> {
  const found = await callOdoo(
    'res.partner', 'search_read',
    [[['name', '=', name]]],
    { fields: ['id', 'name'], limit: 1 }
  ) as Array<{ id: number }>;

  if (found?.length > 0) return found[0].id;

  return callOdoo('res.partner', 'create', [{
    name,
    email:        email || '',
    phone:        phone || '',
    company_type: 'company',
    is_company:   true,
  }]) as Promise<number>;
}

// ── Crear oportunidad en CRM (aparece como OdooBot) ──────────
async function createCRMLead(params: {
  name:        string;
  partnerId:   number;
  revenue:     number;
  description: string;
  folio:       string;
}): Promise<number> {
  return callOdoo('crm.lead', 'create', [{
    name:            params.name,
    partner_id:      params.partnerId,
    planned_revenue: params.revenue,
    description:     params.description,
    type:            'opportunity',
    user_id:         1,            // OdooBot como responsable
    ref:             params.folio, // Folio de la cotización
  }]) as Promise<number>;
}

// ── Enviar cotización a Odoo CRM ─────────────────────────────
export async function sendQuoteToOdoo(
  quote: Quote
): Promise<{ leadId: number; partnerId: number }> {
  const total = (quote.price || 0) * quote.quantity;

  const partnerId = await findOrCreatePartner(
    quote.client_name,
    quote.client_email || '',
    quote.client_phone || '',
  );

  const description = [
    `<b>Folio Alamex:</b> ${quote.folio}`,
    `<b>Modelo:</b> ${quote.model} | ${quote.use_type}`,
    `<b>Capacidad:</b> ${quote.capacity} kg / ${quote.persons} personas`,
    `<b>Velocidad:</b> ${quote.speed} m/s | <b>Paradas:</b> ${quote.stops}`,
    `<b>Recorrido:</b> ${((quote.travel || 0) / 1000).toFixed(1)} m`,
    `<b>Cubo:</b> ${quote.shaft_width} × ${quote.shaft_depth} mm`,
    `<b>Acabado:</b> ${quote.cabin_finish || '—'} | <b>Piso:</b> ${quote.cabin_floor || '—'} | <b>Plafón:</b> ${quote.cop_model || '—'}`,
    `<b>Proveedor:</b> ${quote.supplier} | <b>Normativa:</b> ${quote.norm}`,
    `<b>Total:</b> $${total.toLocaleString('es-MX')} ${quote.currency}`,
  ].join('<br/>');

  const leadId = await createCRMLead({
    name:      `[${quote.folio}] Elevador ${quote.model} — ${quote.client_name}`,
    partnerId,
    revenue:   total,
    description,
    folio:     quote.folio,
  });

  return { leadId, partnerId };
}

// ── Probar conexión con Odoo ──────────────────────────────────
export async function testOdooConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await callProxy('test', {});
    return { ok: true, message: 'Conexión exitosa con Odoo' };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

// Mantener compatibilidad con código existente
export async function saveOdooCredentials(): Promise<void> {
  console.info('Las credenciales de Odoo se configuran en variables de entorno de Vercel');
}

export async function getOdooCredentials(): Promise<OdooConfig | null> {
  return null;
}

export async function authenticateOdoo(): Promise<{ uid: number; name: string }> {
  throw new Error('No aplica — usa variables de entorno ODOO_UID y ODOO_API_KEY');
}
