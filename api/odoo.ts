// ARCHIVO: api/odoo.ts v5
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

// ── XML-RPC serializer ───────────────────────────────────────
function toXml(val: unknown): string {
  if (val === null || val === undefined)
    return '<value><string></string></value>';
  if (typeof val === 'boolean')
    return `<value><boolean>${val ? 1 : 0}</boolean></value>`;
  if (typeof val === 'number')
    return Number.isInteger(val)
      ? `<value><int>${val}</int></value>`
      : `<value><double>${val}</double></value>`;
  if (typeof val === 'string') {
    const s = val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<value><string>${s}</string></value>`;
  }
  if (Array.isArray(val))
    return `<value><array><data>${val.map(toXml).join('')}</data></array></value>`;
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string,unknown>)
      .map(([k,v]) => `<member><name>${k}</name>${toXml(v)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(val)}</string></value>`;
}

// ── XML-RPC call ─────────────────────────────────────────────
async function xmlrpc(model: string, method: string, args: unknown[]): Promise<unknown> {
  const paramNodes = [ODOO_DB, ODOO_UID, ODOO_API_KEY, model, method, args]
    .map(v => `<param>${toXml(v)}</param>`).join('');

  const body = `<?xml version="1.0"?><methodCall><methodName>execute_kw</methodName><params>${paramNodes}</params></methodCall>`;

  const res = await fetch(`${ODOO_URL}/xmlrpc/2/object`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body,
  });

  const text = await res.text();
  if (!text) throw new Error('Odoo devolvio respuesta vacia');

  if (text.includes('<fault>')) {
    const msg = text.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1]
      ?? text.match(/<string>([\s\S]*?)<\/string>/)?.[1]
      ?? 'Error de Odoo';
    throw new Error(msg.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').substring(0,400));
  }

  // Extraer resultado
  const m = text.match(/<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/);
  if (!m) return null;
  return parseXml(m[1].trim());
}

function parseXml(s: string): unknown {
  if (s.startsWith('<int>') || s.startsWith('<i4>'))
    return parseInt(s.replace(/<[^>]+>/g,''));
  if (s.startsWith('<double>'))
    return parseFloat(s.replace(/<[^>]+>/g,''));
  if (s.startsWith('<boolean>'))
    return s.includes('>1<');
  if (s.startsWith('<string>') || (!s.startsWith('<')))
    return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  if (s.startsWith('<nil/>'))
    return null;
  if (s.startsWith('<array>')) {
    const data = s.replace(/^<array><data>|<\/data><\/array>$/g,'');
    const items: unknown[] = [];
    const re = /<value>([\s\S]*?)<\/value>/g;
    let m;
    while ((m = re.exec(data))) items.push(parseXml(m[1].trim()));
    return items;
  }
  if (s.startsWith('<struct>')) {
    const obj: Record<string,unknown> = {};
    const re = /<member><name>(.*?)<\/name><value>([\s\S]*?)<\/value><\/member>/g;
    let m;
    while ((m = re.exec(s))) obj[m[1]] = parseXml(m[2].trim());
    return obj;
  }
  return s.replace(/<[^>]+>/g,'');
}

// ── Handler principal ────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY || !ODOO_DB)
    return res.status(500).json({ ok: false, error: 'Variables de entorno faltantes', version: 'v5' });

  try {
    const { action, model, method, args = [], kwargs = {} } = req.body ?? {};

    if (action === 'test') {
      const result = await xmlrpc('res.users', 'read', [[ODOO_UID], { fields: ['name','login'] }]);
      return res.status(200).json({ ok: true, result, version: 'v5' });
    }

    if (action === 'call_kw') {
      if (!model || !method)
        return res.status(400).json({ ok: false, error: 'Faltan model y method' });

      let finalArgs: unknown[];

      if (method === 'create') {
        // create(vals) — un solo dict, sin lista wrapper adicional
        finalArgs = [args[0] ?? {}];
      } else if (method === 'write') {
        // write([ids], vals)
        finalArgs = [args[0] ?? [], args[1] ?? {}];
      } else if (method === 'search_read') {
        // search_read([domain], fields, offset, limit, order)
        finalArgs = [args[0] ?? [], kwargs];
      } else if (method === 'read') {
        // read([ids], fields)
        finalArgs = [args[0] ?? [], kwargs];
      } else if (method === 'search') {
        finalArgs = [args[0] ?? []];
      } else {
        finalArgs = args.length > 0 ? args : [];
      }

      const result = await xmlrpc(model, method, finalArgs);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v5' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v5' });
  }
}
