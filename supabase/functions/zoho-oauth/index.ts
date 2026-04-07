// supabase/functions/zoho-oauth/index.ts
// Intercambia el código OAuth de Zoho por tokens y los guarda en el perfil.
//
// Secrets requeridos (solo estos 3):
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REGION  (opcional)
//
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son automáticas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID     = Deno.env.get('ZOHO_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET')!;
const ZOHO_REGION   = Deno.env.get('ZOHO_REGION') || 'com';
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SRV  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, userId, redirectUri } = await req.json();
    if (!code || !userId) throw new Error('code y userId son requeridos');

    // 1. Intercambiar código por tokens
    const tokenRes = await fetch(`https://accounts.zoho.${ZOHO_REGION}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  redirectUri,
        code,
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(`Zoho error: ${tokens.error}`);

    // 2. Obtener info de la cuenta de Zoho Mail
    const accountRes = await fetch(`https://mail.zoho.${ZOHO_REGION}/api/accounts`, {
      headers: { 'Authorization': `Zoho-oauthtoken ${tokens.access_token}` },
    });
    const accountData = await accountRes.json();
    const zohoAccount = accountData.Data?.[0];

    // 3. Guardar en Supabase usando service role (bypassa RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SRV);
    const { error } = await supabase.from('profiles').update({
      zoho_config: JSON.stringify({
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        accountId:    zohoAccount?.accountId || '',
        email:        zohoAccount?.emailAddress || '',
        region:       ZOHO_REGION,
        expiresAt:    Date.now() + ((tokens.expires_in || 3600) * 1000),
      }),
    }).eq('id', userId);

    if (error) throw new Error(`Error guardando config: ${error.message}`);

    return new Response(JSON.stringify({
      ok:    true,
      email: zohoAccount?.emailAddress || '',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
