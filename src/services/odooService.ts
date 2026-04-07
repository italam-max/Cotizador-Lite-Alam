// ARCHIVO: src/services/odooService.ts
// Integración con Odoo 16 via JSON-RPC
// Soporta: API Key personal por vendedor O usuario/contraseña

import { supabase } from './supabase';

export interface OdooConfig {
  url:     string;  // ej: https://odoo.alam.mx
  db:      string;  // ej: alam_prod
  uid:     number;  // ID del usuario en Odoo
  apiKey:  string;  // API Key personal (Settings > Technical > API Keys)
  // OR (si usan usuario/contraseña):
  email?:  string;
  method?: 'apikey' | 'password';
}

// ── Guardar credenciales de Odoo en el perfil del usuario (Supabase) ─
export async function saveOdooCredentials(userId: string, config: OdooConfig): Promise<void> {
  // Guardamos en la columna odoo_config del perfil
  // NOTA: En producción encriptar el apiKey antes de guardar
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ odoo_config: JSON.stringify(config) })
    .eq('id', userId);
  if (error) throw error;
}

// ── Leer credenciales del perfil ────────────────────────────
export async function getOdooCredentials(userId: string): Promise<OdooConfig | null> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('odoo_config')
    .eq('id', userId)
    .single();
  if (!data?.odoo_config) return null;
  try { return JSON.parse(data.odoo_config); } catch { return null; }
}

// ── Autenticar con usuario/contraseña y obtener UID ─────────
export async function authenticateOdoo(url: string, db: string, email: string, password: string): Promise<number> {
  // Asegurar que la URL tenga protocolo
  const baseUrl = url.startsWith('http') ? url : `https://${url}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/web/session/authenticate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 1,
        params: { db, login: email, password },
      }),
    });
  } catch (e: any) {
    // Error de red — CORS, DNS, o URL incorrecta
    if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
      throw new Error(
        `No se pudo conectar a ${baseUrl}. Verifica:\n` +
        `• Que la URL sea correcta (ej: https://odoo.alam.mx)\n` +
        `• Que Odoo esté accesible desde internet\n` +
        `• Posible bloqueo CORS — Odoo debe permitir requests desde ${window.location.origin}`
      );
    }
    throw new Error(`Error de red: ${e.message}`);
  }

  // Verificar que la respuesta sea JSON válido
  const text = await res.text();
  if (!text || text.trim() === '') {
    throw new Error(`Odoo devolvió una respuesta vacía. Verifica la URL y base de datos.`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Odoo devolvió una respuesta inválida. Respuesta recibida:\n"${text.substring(0, 100)}..."\n` +
      `Verifica que la URL apunte a Odoo correctamente.`
    );
  }

  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Error de autenticación');
  if (!data.result?.uid) throw new Error('Credenciales incorrectas — verifica email y contraseña');
  return data.result.uid;
}

// ── Llamada genérica al JSON-RPC de Odoo ────────────────────
async function callOdoo(config: OdooConfig, model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const baseUrl = config.url.startsWith('http') ? config.url : `https://${config.url}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.apiKey) {
    headers['Authorization'] = `Basic ${btoa(`${config.uid}:${config.apiKey}`)}`;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: Math.floor(Math.random() * 1000),
        params: {
          model, method, args,
          kwargs: { ...kwargs, context: { uid: config.uid, ...(kwargs.context || {}) } },
        },
      }),
    });
  } catch (e: any) {
    throw new Error(`Error de conexión con Odoo: ${e.message}`);
  }

  const text = await res.text();
  if (!text || text.trim() === '') throw new Error('Odoo devolvió una respuesta vacía');

  let data: any;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Respuesta inválida de Odoo: "${text.substring(0, 80)}..."`); }

  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Error Odoo');
  return data.result;
}

// ── Buscar o crear cliente (res.partner) ────────────────────
export async function findOrCreatePartner(config: OdooConfig, name: string, email?: string, phone?: string): Promise<number> {
  // Buscar por nombre
  const found = await callOdoo(config, 'res.partner', 'search_read',
    [[['name', '=', name]]],
    { fields: ['id', 'name'], limit: 1 }
  );
  if (found?.length > 0) return found[0].id;

  // Crear nuevo
  const id = await callOdoo(config, 'res.partner', 'create', [{
    name,
    email:        email || '',
    phone:        phone || '',
    company_type: 'company',
    is_company:   true,
  }]);
  return id;
}

// ── Crear oportunidad en CRM ─────────────────────────────────
export async function createCRMLead(config: OdooConfig, data: {
  name:        string;
  partnerId:   number;
  revenue:     number;
  description: string;
  userId?:     number;  // vendedor en Odoo (opcional)
}): Promise<number> {
  const id = await callOdoo(config, 'crm.lead', 'create', [{
    name:             data.name,
    partner_id:       data.partnerId,
    planned_revenue:  data.revenue,
    description:      data.description,
    type:             'opportunity',
    user_id:          data.userId || config.uid, // asignado al vendedor que hace el insert
  }]);
  return id;
}

// ── Función principal: enviar cotización a Odoo CRM ─────────
import type { Quote } from '../types';

export async function sendQuoteToOdoo(config: OdooConfig, quote: Quote): Promise<{ leadId: number; partnerId: number }> {
  // 1. Buscar o crear cliente
  const partnerId = await findOrCreatePartner(
    config, quote.client_name, quote.client_email || '', quote.client_phone || ''
  );

  // 2. Construir descripción completa
  const total = (quote.price || 0) * quote.quantity;
  const description = [
    `<b>Folio Alamex:</b> ${quote.folio}`,
    `<b>Modelo:</b> ${quote.model} | ${quote.use_type}`,
    `<b>Capacidad:</b> ${quote.capacity} kg / ${quote.persons} personas`,
    `<b>Velocidad:</b> ${quote.speed} m/s | <b>Paradas:</b> ${quote.stops}`,
    `<b>Recorrido:</b> ${((quote.travel || 0) / 1000).toFixed(1)} m`,
    `<b>Cubo:</b> ${quote.shaft_width} × ${quote.shaft_depth} mm`,
    `<b>Acabado paredes:</b> ${quote.cabin_finish || '—'}`,
    `<b>Piso:</b> ${quote.cabin_floor || '—'} | <b>Plafón:</b> ${quote.cop_model || '—'}`,
    `<b>Proveedor:</b> ${quote.supplier} | <b>Normativa:</b> ${quote.norm}`,
    `<b>Total:</b> $${total.toLocaleString('es-MX')} ${quote.currency}`,
  ].join('<br/>');

  // 3. Crear oportunidad
  const leadId = await createCRMLead(config, {
    name:      `[${quote.folio}] Elevador ${quote.model} — ${quote.client_name}`,
    partnerId,
    revenue:   total,
    description,
    userId:    config.uid, // creado por el vendedor autenticado
  });

  return { leadId, partnerId };
}
