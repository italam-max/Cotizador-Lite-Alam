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

async function callOdoo(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<unknown> {
  return callProxy('call_kw', { model, method, args, kwargs });
}

async function findOrCreatePartner(name: string, email?: string, phone?: string): Promise<number> {
  // Buscar partner existente
  const found = await callOdoo('res.partner', 'search_read',
    [[['name', '=', name]]],
    { fields: ['id', 'name'], limit: 1 }
  ) as Array<{ id: number }>;
  if (found?.length > 0) return found[0].id;

  // Crear nuevo — args[0] es el dict de valores
  return callOdoo('res.partner', 'create', [{
    name,
    email:        email || '',
    phone:        phone || '',
    company_type: 'company',
    is_company:   true,
  }]) as Promise<number>;
}

async function createCRMLead(params: {
  name: string; partnerId: number; revenue: number;
  description: string; folio: string;
}): Promise<number> {
  return callOdoo('crm.lead', 'create', [{
    name:            params.name,
    partner_id:      params.partnerId,
    planned_revenue: params.revenue,
    description:     params.description,
    type:            'opportunity',
    user_id:         1,
    ref:             params.folio,
  }]) as Promise<number>;
}

export async function sendQuoteToOdoo(quote: Quote): Promise<{ leadId: number; partnerId: number }> {
  const total = (quote.price || 0) * quote.quantity;

  const partnerId = await findOrCreatePartner(
    quote.client_name, quote.client_email || '', quote.client_phone || ''
  );

  const description = [
    `<b>Folio:</b> ${quote.folio}`,
    `<b>Modelo:</b> ${quote.model} | ${quote.use_type}`,
    `<b>Capacidad:</b> ${quote.capacity} kg / ${quote.persons} personas`,
    `<b>Paradas:</b> ${quote.stops} | <b>Velocidad:</b> ${quote.speed} m/s`,
    `<b>Total:</b> $${total.toLocaleString('es-MX')} ${quote.currency}`,
  ].join('<br/>');

  const leadId = await createCRMLead({
    name:      `[${quote.folio}] ${quote.model} — ${quote.client_name}`,
    partnerId, revenue: total, description, folio: quote.folio,
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
