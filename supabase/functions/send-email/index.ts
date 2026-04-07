// supabase/functions/send-email/index.ts
// Edge Function para enviar correo via Zoho Mail API
//
// Secrets requeridos en Supabase Dashboard → Edge Functions → Manage secrets:
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REGION  (opcional, default: 'com')
//
// SUPABASE_URL y SUPABASE_ANON_KEY son automáticas — NO las agregues como secret

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID     = Deno.env.get('ZOHO_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET')!;
const ZOHO_REGION   = Deno.env.get('ZOHO_REGION') || 'com';

// Estas son automáticas en Edge Functions — no necesitas agregarlas como secrets
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SRV_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshZohoToken(refreshToken: string): Promise<string> {
  const res = await fetch(`https://accounts.zoho.${ZOHO_REGION}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Error refrescando token Zoho: ${data.error}`);
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Sin autorización');

    // Verificar JWT del usuario — usando la anon key automática
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Usuario no autenticado');

    // Leer config Zoho del perfil — usando service role para bypassear RLS
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SRV_KEY);
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('zoho_config, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.zoho_config) {
      throw new Error('No hay cuenta Zoho configurada. Autoriza primero en Configuración.');
    }

    const zohoConfig = JSON.parse(profile.zoho_config);

    // Refrescar token si expiró (5 min de margen)
    let accessToken = zohoConfig.accessToken;
    if (Date.now() > (zohoConfig.expiresAt || 0) - 300000) {
      accessToken = await refreshZohoToken(zohoConfig.refreshToken);
      await adminClient.from('profiles').update({
        zoho_config: JSON.stringify({
          ...zohoConfig,
          accessToken,
          expiresAt: Date.now() + 3600000,
        }),
      }).eq('id', user.id);
    }

    const { to, subject, bodyHtml, bodyText, attachmentBase64, attachmentName } = await req.json();
    if (!to || !subject) throw new Error('to y subject son requeridos');

    const messageBody: Record<string, any> = {
      fromAddress: zohoConfig.email,
      toAddress:   to,
      subject,
      content:     bodyHtml || bodyText || '',
      mailFormat:  bodyHtml ? 'html' : 'plaintext',
    };

    if (attachmentBase64 && attachmentName) {
      messageBody.attachments = [{
        content:     attachmentBase64,
        fileName:    attachmentName,
        contentType: 'application/pdf',
      }];
    }

    const sendRes = await fetch(
      `https://mail.zoho.${ZOHO_REGION}/api/accounts/${zohoConfig.accountId}/messages`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    );

    const sendData = await sendRes.json();
    if (sendData.status?.code !== 200 && sendData.status?.code !== 201) {
      throw new Error(sendData.status?.description || 'Error enviando correo por Zoho');
    }

    return new Response(JSON.stringify({
      ok:        true,
      messageId: sendData.data?.messageId,
      from:      `${profile.full_name || zohoConfig.email} <${zohoConfig.email}>`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
