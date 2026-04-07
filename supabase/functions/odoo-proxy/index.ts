// supabase/functions/odoo-proxy/index.ts
// Proxy para llamadas a Odoo 16 — evita restricciones CORS del browser.
// El browser llama a esta Edge Function, y ella llama a Odoo servidor a servidor.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Sin autorización');

    // Verificar JWT Supabase
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error) throw new Error(`Session expired — ${error.message}`);
    if (!user) throw new Error('Usuario no autenticado — vuelve a iniciar sesión');

    // Obtener config Odoo del perfil
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: profile } = await adminClient
      .from('profiles').select('odoo_config').eq('id', user.id).single();

    const body = await req.json();
    const { action, odooConfig: bodyCfg } = body;

    const baseUrl_from_body = (bodyCfg?.url || '').startsWith('http')
      ? bodyCfg?.url
      : `https://${bodyCfg?.url || ''}`;

    // Para autenticar no necesitamos config guardada — viene en el body
    if (action === 'authenticate') {
      const { db, email, password } = body;
      if (!bodyCfg?.url || !db || !email || !password) {
        throw new Error('Faltan campos: url, db, email y password son requeridos para autenticar');
      }
      const baseUrl = baseUrl_from_body;
      const res  = await fetch(`${baseUrl}/web/session/authenticate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1,
          params: { db, login: email, password } }),
      });
      const text = await res.text();
      if (!text) throw new Error(`Odoo en ${baseUrl} no respondió. Verifica la URL.`);
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error.data?.message || 'Credenciales incorrectas');
      if (!data.result?.uid) throw new Error('No se pudo autenticar — verifica email y contraseña');
      result = { uid: data.result.uid, name: data.result.name };

    } else if (action === 'call_kw') {
      // Para call_kw sí necesitamos config del perfil
      const cfg = bodyCfg || (profile?.odoo_config ? JSON.parse(profile.odoo_config) : null);
      if (!cfg?.url) throw new Error('Sin configuración de Odoo guardada.');
      const baseUrl = cfg.url.startsWith('http') ? cfg.url : `https://${cfg.url}`;
      const { model, method, args = [], kwargs = {} } = body;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Basic ${btoa(`${cfg.uid}:${cfg.apiKey}`)}`;

      const res  = await fetch(`${baseUrl}/web/dataset/call_kw`, {
        method: 'POST', headers,
        body:   JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(),
          params: { model, method, args,
            kwargs: { ...kwargs, context: { uid: cfg.uid, ...(kwargs.context||{}) } } } }),
      });
      const text = await res.text();
      if (!text) throw new Error('Odoo devolvió respuesta vacía');
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error.data?.message || data.error.message);
      result = data.result;

    } else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
