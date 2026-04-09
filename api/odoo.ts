// ARCHIVO: api/odoo.ts v4
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

// XML-RPC value serializer
function toXml(val: unknown): string {
  if (val === null || val === undefined) return '<value><boolean>0</boolean></value>';
  if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`;
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? `<value><int>${val}</int></value>`
      : `<value><double>${val}</double></value>`;
  }
  if (typeof val === 'string') {
    const escaped = val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<value><string>${escaped}</string></value>`;
  }
  if (Array.isArray(val)) {
    return `<value><array><data>${val.map(toXml).join('')}</data></array></value>`;
  }
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string,unknown>)
      .map(([k,v]) => `<member><name>${k}</name>${toXml(v)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(val)}</string></value>`;
}

// XML-RPC simple parser
function parseVal(node: string): unknown {
  const inner = node.replace(/^\s*<value>\s*|\s*<\/value>\s*$/g, '').trim();
  if (inner.startsWith('<int>') || inner.startsWith('<i4>'))
    return parseInt(inner.replace(/<[^>]+>/g,''));
  if (inner.startsWith('<double>'))
    return parseFloat(inner.replace(/<[^>]+>/g,''));
  if (inner.startsWith('<boolean>'))
    return inner.includes('>1<');
  if (inner.startsWith('<string>'))
    return inner.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  if (inner.startsWith('<nil/>') || inner === '')
    return null;
  if (inner.startsWith('<array>')) {
    const items: unknown[] = [];
    const re = /<value>([\s\S]*?)<\/value>/g;
    let m;
    const data = inner.replace(/^<array><data>|<\/data><\/array>$/g,'');
    while ((m = re.exec(data)) !== null) items.push(parseVal(`<value>${m[1]}</value>`));
    return items;
  }
  if (inner.startsWith('<struct>')) {
    const obj: Record<string,unknown> = {};
    const re = /<member>\s*<name>(.*?)<\/name>\s*(<value>[\s\S]*?<\/value>)\s*<\/member>/g;
    let m;
    while ((m = re.exec(inner)) !== null) obj[m[1]] = parseVal(m[2]);
    return obj;
  }
  // string sin tags
  return inner.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}

async function xmlrpcCall(model: string, method: string, args: unknown[]): Promise<unknown> {
  const argsXml = [ODOO_DB, ODOO_UID, ODOO_API_KEY, model, method, args]
    .map(toXml).join('');

  const xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>${argsXml.split('</value>').map((p,i,a) =>
    i < a.length-1 ? `<param>${p}</value></param>` : ''
  ).join('')}</params>
</methodCall>`;

  // Construir XML manualmente para mayor control
  const paramNodes = [ODOO_DB, ODOO_UID, ODOO_API_KEY, model, method, args]
    .map(v => `<param>${toXml(v)}</param>`).join('');

  const xmlBody = `<?xml version="1.0"?><methodCall><methodName>execute_kw</methodName><params>${paramNodes}</params></methodCall>`;

  const res = await fetch(`${ODOO_URL}/xmlrpc/2/object`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xmlBody,
  });

  const text = await res.text();
  if (!text) throw new Error('Odoo devolvio respuesta vacia');

  if (text.includes('<fault>')) {
    const msg = text.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1]
      ?? text.match(/<string>([\s\S]*?)<\/string>/)?.[1]
      ?? 'Error de Odoo';
    throw new Error(msg.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').substring(0, 300));
  }

  const match = text.match(/<param>\s*(<value>[\s\S]*?<\/value>)\s*<\/param>/);
  if (!match) return null;
  return parseVal(match[1]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY || !ODOO_DB) {
    return res.status(500).json({ ok: false, error: 'Variables de entorno faltantes', version: 'v4' });
  }

  try {
    const body   = req.body ?? {};
    const action = body.action ?? '';

    if (action === 'test') {
      const result = await xmlrpcCall('res.users', 'read', [[ODOO_UID], { fields: ['name','login'] }]);
      return res.status(200).json({ ok: true, result, version: 'v4' });
    }

    if (action === 'call_kw') {
      const { model, method, args = [], kwargs = {} } = body;
      if (!model || !method) return res.status(400).json({ ok: false, error: 'Faltan model y method' });

      // Para create/write: args = [[vals]] sin kwargs extra
      // Para search_read: args = [[domain]], kwargs = { fields, limit }
      let finalArgs: unknown[];
      if (method === 'create') {
        // args[0] debe ser el dict de valores
        finalArgs = [args[0] ?? {}];
      } else if (method === 'search_read') {
        finalArgs = [args[0] ?? [], kwargs];
      } else if (method === 'read') {
        finalArgs = [args[0] ?? [], kwargs];
      } else {
        finalArgs = Object.keys(kwargs).length > 0 ? [...args, kwargs] : args;
      }

      const result = await xmlrpcCall(model, method, finalArgs);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v4' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v4' });
  }
}
