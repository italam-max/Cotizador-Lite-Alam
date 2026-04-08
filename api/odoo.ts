// ARCHIVO: api/odoo.ts
// Vercel Serverless Function — proxy directo a Odoo
// Las credenciales viven en variables de entorno de Vercel (nunca en el frontend)
//
// Variables requeridas en Vercel Dashboard → Settings → Environment Variables:
//   ODOO_URL      = http://54.226.3.249:8016
//   ODOO_DB       = odoo13_backup_2024_12_14_09_55
//   ODOO_UID      = 35656
//   ODOO_API_KEY  = tu_api_key_de_odoo
//
// Para pruebas locales, crea un archivo .env.local en la raíz con esas mismas variables.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL!;
const ODOO_DB      = process.env.ODOO_DB!;
const ODOO_UID     = parseInt(process.env.ODOO_UID || '0');
const ODOO_API_KEY = process.env.ODOO_API_KEY!;

// CORS headers — permite llamadas desde localhost y desde Vercel
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper: llamada JSON-RPC a Odoo con autenticación via API Key
async function odooCall(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<unknown> {
  const authHeader = `Basic ${Buffer.from(`${ODOO_UID}:${ODOO_API_KEY}`).toString('base64')}`;

  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method:  'call',
      id:      Date.now(),
      params: {
        model,
        method,
        args,
        kwargs: { ...kwargs, context: { uid: ODOO_UID } },
      },
    }),
  });

  const text = await res.text();
  if (!text) throw new Error('Odoo devolvió respuesta vacía — verifica ODOO_URL');

  const data = JSON.parse(text);
  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || 'Error de Odoo');
  }

  return data.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  // Validar variables de entorno
  if (!ODOO_URL || !ODOO_DB || !ODOO_UID || !ODOO_API_KEY) {
    return res.status(500).json({
      ok:    false,
      error: 'Variables de entorno de Odoo no configuradas (ODOO_URL, ODOO_DB, ODOO_UID, ODOO_API_KEY)',
    });
  }

  try {
    const { action, model, method, args = [], kwargs = {} } = req.body;

    if (action === 'call_kw') {
      if (!model || !method) {
        return res.status(400).json({ ok: false, error: 'Se requieren model y method' });
      }
      const result = await odooCall(model, method, args, kwargs);
      return res.status(200).json({ ok: true, result });
    }

    if (action === 'test') {
      // Endpoint de prueba — verifica que las credenciales funcionan
      const result = await odooCall('res.users', 'read', [[ODOO_UID], ['name', 'email', 'login']]);
      return res.status(200).json({ ok: true, result, message: 'Conexión exitosa con Odoo' });
    }

    return res.status(400).json({ ok: false, error: `Acción no soportada: ${action}` });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[odoo-proxy] Error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}
