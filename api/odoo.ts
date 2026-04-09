// ARCHIVO: api/odoo.ts v3 — usa XML-RPC que sí soporta API Key en Odoo 16
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

// XML-RPC call — el único método que acepta API Key en Odoo 16
async function xmlrpcCall(
  model: string,
  method: string,
  args: unknown[]
): Promise<unknown> {
  const params = [ODOO_DB, ODOO_UID, ODOO_API_KEY, model, method, args];
  const xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>
    ${params.map(p => `<param><value>${toXmlValue(p)}</value></param>`).join('\n    ')}
  </params>
</methodCall>`;

  const res = await fetch(`${ODOO_URL}/xmlrpc/2/object`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xml,
  });

  const text = await res.text();
  if (!text) throw new Error('Odoo devolvió respuesta vacía');
  if (text.includes('<fault>')) {
    const msg = text.match(/<string>(.*?)<\/string>/s)?.[1] ?? 'Error de Odoo';
    throw new Error(msg.replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  }

  return parseXmlResponse(text);
}

// Convertir valor JS a XML-RPC
function toXmlValue(val: unknown): string {
  if (val === null || val === undefined) return '<nil/>';
  if (typeof val === 'boolean') return `<boolean>${val ? 1 : 0}</boolean>`;
  if (typeof val === 'number') return Number.isInteger(val) ? `<int>${val}</int>` : `<double>${val}</double>`;
  if (typeof val === 'string') return `<string>${val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string>`;
  if (Array.isArray(val)) return `<array><data>${val.map(v => `<value>${toXmlValue(v)}</value>`).join('')}</data></array>`;
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `<member><name>${k}</name><value>${toXmlValue(v)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  }
  return `<string>${String(val)}</string>`;
}

// Parser XML-RPC simple
function parseXmlResponse(xml: string): unknown {
  // Extraer el primer value del response
  const match = xml.match(/<methodResponse>\s*<params>\s*<param>\s*<value>([\s\S]*?)<\/value>/);
  if (!match) return null;
  return parseXmlValue(match[1].trim());
}

function parseXmlValue(xml: string): unknown {
  if (xml.startsWith('<int>') || xml.startsWith('<i4>')) return parseInt(xml.replace(/<\/?(?:int|i4)>/g, ''));
  if (xml.startsWith('<double>')) return parseFloat(xml.replace(/<\/?double>/g, ''));
  if (xml.startsWith('<boolean>')) return xml.includes('>1<') ;
  if (xml.startsWith('<string>') || xml.startsWith('<nil')) return xml.replace(/<\/?[^>]+>/g, '').trim();
  if (xml.startsWith('<array>')) {
    const items = [...xml.matchAll(/<value>([\s\S]*?)<\/value>/g)].map(m => parseXmlValue(m[1].trim()));
    return items;
  }
  if (xml.startsWith('<struct>')) {
    const obj: Record<string, unknown> = {};
    const members = [...xml.matchAll(/<member>\s*<name>(.*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/g)];
    for (const m of members) obj[m[1]] = parseXmlValue(m[2].trim());
    return obj;
  }
  return xml.replace(/<\/?[^>]+>/g, '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY || !ODOO_DB) {
    return res.status(500).json({
      ok: false,
      error: `Variables faltantes: URL=${!!ODOO_URL} DB=${!!ODOO_DB} UID=${!!ODOO_UID} KEY=${!!ODOO_API_KEY}`,
      version: 'v3'
    });
  }

  try {
    const body   = req.body ?? {};
    const action = body.action ?? '';

    if (action === 'test') {
      const result = await xmlrpcCall('res.users', 'read', [[ODOO_UID], { fields: ['name', 'login'] }]);
      return res.status(200).json({ ok: true, result, version: 'v3' });
    }

    if (action === 'call_kw') {
      const { model, method, args = [], kwargs = {} } = body;
      if (!model || !method) return res.status(400).json({ ok: false, error: 'Faltan model y method' });
      const result = await xmlrpcCall(model, method, [...args, kwargs]);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v3' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v3' });
  }
}
