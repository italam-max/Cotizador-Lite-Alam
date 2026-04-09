// ARCHIVO: api/odoo.ts v6 — usa librería xmlrpc nativa de Node
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as xmlrpc from 'xmlrpc';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

function getClient() {
  const url = new URL(ODOO_URL);
  const opts = {
    host: url.hostname,
    port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '80')),
    path: '/xmlrpc/2/object',
  };
  return url.protocol === 'https:'
    ? xmlrpc.createSecureClient(opts)
    : xmlrpc.createClient(opts);
}

function xmlrpcCall(model: string, method: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = getClient();
    client.methodCall(
      'execute_kw',
      [ODOO_DB, ODOO_UID, ODOO_API_KEY, model, method, args],
      (err: Error | null, val: unknown) => {
        if (err) reject(err);
        else resolve(val);
      }
    );
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY || !ODOO_DB)
    return res.status(500).json({ ok: false, error: 'Variables de entorno faltantes', version: 'v6' });

  try {
    const { action, model, method, args = [], kwargs = {} } = req.body ?? {};

    if (action === 'test') {
      const result = await xmlrpcCall('res.users', 'read', [[ODOO_UID], { fields: ['name', 'login'] }]);
      return res.status(200).json({ ok: true, result, version: 'v6' });
    }

    if (action === 'call_kw') {
      if (!model || !method)
        return res.status(400).json({ ok: false, error: 'Faltan model y method' });

      let finalArgs: unknown[];
      if (method === 'create') {
        finalArgs = [args[0] ?? {}];
      } else if (method === 'write') {
        finalArgs = [args[0] ?? [], args[1] ?? {}];
      } else if (method === 'search_read') {
        finalArgs = [[args[0] ?? []], kwargs];
      } else if (method === 'read') {
        finalArgs = [[args[0] ?? []], kwargs];
      } else {
        finalArgs = args;
      }

      const result = await xmlrpcCall(model, method, finalArgs);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v6' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v6' });
  }
}
