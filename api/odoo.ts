// ARCHIVO: api/odoo.ts v2
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

async function odooCall(
  model: string, method: string, args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  const auth = Buffer.from(`${ODOO_UID}:${ODOO_API_KEY}`).toString('base64');
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Date.now(),
      params: {
        model, method, args,
        kwargs: { ...kwargs, context: { uid: ODOO_UID } },
      },
    }),
  });
  const text = await res.text();
  if (!text) throw new Error('Odoo devolvio respuesta vacia');
  const data = JSON.parse(text);
  if (data.error) throw new Error(data.error.data?.message ?? data.error.message ?? 'Error Odoo');
  return data.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Validar variables
  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: `Variables faltantes: URL=${!!ODOO_URL} UID=${!!ODOO_UID} KEY=${!!ODOO_API_KEY}`,
      version: 'v2'
    });
  }

  try {
    const body  = req.body ?? {};
    const action = body.action ?? '';

    if (action === 'test') {
      const result = await odooCall('res.users', 'read', [[ODOO_UID]], { fields: ['name', 'login'] });
      return res.status(200).json({ ok: true, result, version: 'v2' });
    }

    if (action === 'call_kw') {
      const { model, method, args = [], kwargs = {} } = body;
      if (!model || !method) return res.status(400).json({ ok: false, error: 'Faltan model y method' });
      const result = await odooCall(model, method, args, kwargs);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v2' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v2' });
  }
}
