import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

// Decodificar JWT sin verificar firma (ya lo hace Supabase gateway)
function decodeJWT(token: string): any {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Extraer user_id del JWT sin llamar a getUser()
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) throw new Error('Sin token de autorización');

    const payload = decodeJWT(token);
    if (!payload?.sub) throw new Error('Token inválido');

    const userId = payload.sub as string;

    // Verificar que el token no expiró
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new Error('Token expirado — vuelve a iniciar sesión');
    }

    // Obtener config Odoo del perfil con service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SRV);
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('odoo_config')
      .eq('id', userId)
      .single();

    if (profileError) throw new Error(`Error leyendo perfil: ${profileError.message}`);

    const body = await req.json();
    const { action, odooConfig: bodyCfg } = body;

    const cfg = bodyCfg || (profile?.odoo_config ? JSON.parse(profile.odoo_config) : null);
    if (!cfg?.url) throw new Error('Sin configuración de Odoo. Configura tus credenciales primero.');

    const baseUrl = cfg.url.startsWith('http') ? cfg.url : `https://${cfg.url}`;
    let result: any;

    if (action === 'authenticate') {
      const { db, email, password } = body;
      const res  = await fetch(`${baseUrl}/web/session/authenticate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          jsonrpc: '2.0', method: 'call', id: 1,
          params:  { db, login: email, password },
        }),
      });
      const text = await res.text();
      if (!text) throw new Error(`Odoo en ${baseUrl} no respondió. Verifica la URL.`);
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error.data?.message || 'Credenciales incorrectas');
      if (!data.result?.uid) throw new Error('No se pudo autenticar — verifica email y contraseña');
      result = { uid: data.result.uid, name: data.result.name };

    } else if (action === 'call_kw') {
      const { model, method, args = [], kwargs = {} } = body;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Basic ${btoa(`${cfg.uid}:${cfg.apiKey}`)}`;

      const res  = await fetch(`${baseUrl}/web/dataset/call_kw`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({
          jsonrpc: '2.0', method: 'call', id: Date.now(),
          params:  {
            model, method, args,
            kwargs: { ...kwargs, context: { uid: cfg.uid, ...(kwargs.context || {}) } },
          },
        }),
      });
      const text = await res.text();
      if (!text) throw new Error('Odoo devolvió respuesta vacía');
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error.data?.message || data.error.message);
      result = data.result;

    } else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    return json({ ok: true, result });

  } catch (e: any) {
    return json({ ok: false, error: e.message }, 400);
  }
});
