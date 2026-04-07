// ARCHIVO: src/services/odooService.ts
// Todas las llamadas a Odoo van via Supabase Edge Function (odoo-proxy)
// para evitar restricciones CORS del browser.

import { supabase } from './supabase';
import type { Quote } from '../types';

export interface OdooConfig {
  url:     string;
  db:      string;
  uid:     number;
  apiKey:  string;
  email?:  string;
  method?: 'apikey' | 'password';
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ── Helper: llamar al proxy de Supabase ─────────────────────
async function callProxy(action: string, params: Record<string, any>): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sin sesión activa');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/odoo-proxy`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error en proxy Odoo');
  return data.result;
}

// ── Autenticar con usuario/contraseña → obtener UID ─────────
export async function authenticateOdoo(
  url: string, db: string, email: string, password: string
): Promise<{ uid: number; name: string }> {
  const baseUrl = url.startsWith('http') ? url : `https://${url}`;
  return callProxy('authenticate', { odooConfig: { url: baseUrl, db }, db, email, password });
}

// ── Guardar credenciales en Supabase ─────────────────────────
export async function saveOdooCredentials(userId: string, config: OdooConfig): Promise<void> {
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ odoo_config: JSON.stringify(config) })
    .eq('id', userId);
  if (error) throw error;
}

// ── Leer credenciales del perfil ─────────────────────────────
export async function getOdooCredentials(userId: string): Promise<OdooConfig | null> {
  const { data } = await (supabase as any)
    .from('profiles').select('odoo_config').eq('id', userId).single();
  if (!data?.odoo_config) return null;
  try { return JSON.parse(data.odoo_config); } catch { return null; }
}

// ── Llamada genérica a Odoo via proxy ────────────────────────
async function callOdoo(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> {
  return callProxy('call_kw', { model, method, args, kwargs });
}

// ── Buscar o crear cliente (res.partner) ────────────────────
async function findOrCreatePartner(name: string, email?: string, phone?: string): Promise<number> {
  const found = await callOdoo('res.partner', 'search_read',
    [[['name', '=', name]]], { fields: ['id', 'name'], limit: 1 });
  if (found?.length > 0) return found[0].id;

  return callOdoo('res.partner', 'create', [{
    name, email: email || '', phone: phone || '',
    company_type: 'company', is_company: true,
  }]);
}

// ── Crear oportunidad en CRM ─────────────────────────────────
async function createCRMLead(params: {
  name: string; partnerId: number; revenue: number; description: string;
}): Promise<number> {
  return callOdoo('crm.lead', 'create', [{
    name:            params.name,
    partner_id:      params.partnerId,
    planned_revenue: params.revenue,
    description:     params.description,
    type:            'opportunity',
  }]);
}

// ── Enviar cotización a Odoo CRM ─────────────────────────────
export async function sendQuoteToOdoo(quote: Quote): Promise<{ leadId: number; partnerId: number }> {
  const total = (quote.price || 0) * quote.quantity;

  const partnerId = await findOrCreatePartner(
    quote.client_name, quote.client_email || '', quote.client_phone || ''
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
  });

  return { leadId, partnerId };
}

// ── Probar la conexión vía proxy ─────────────────────────────
export async function testOdooConnection(
  url: string, db: string, email: string, password: string
): Promise<{ uid: number; name: string }> {
  return authenticateOdoo(url, db, email, password);
}
