// ARCHIVO: api/odoo.ts v7 — fetch puro, XML-RPC manual corregido
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ODOO_URL     = process.env.ODOO_URL     ?? '';
const ODOO_DB      = process.env.ODOO_DB      ?? '';
const ODOO_UID     = parseInt(process.env.ODOO_UID ?? '0', 10);
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

// Serializar valor JS → XML-RPC
function val(v: unknown): string {
  if (v === null || v === undefined) return '<value><string></string></value>';
  if (typeof v === 'boolean')        return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === 'number' && Number.isInteger(v)) return `<value><int>${v}</int></value>`;
  if (typeof v === 'number')         return `<value><double>${v}</double></value>`;
  if (typeof v === 'string') {
    const s = v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<value><string>${s}</string></value>`;
  }
  if (Array.isArray(v)) {
    return `<value><array><data>${v.map(val).join('')}</data></array></value>`;
  }
  if (typeof v === 'object') {
    const members = Object.entries(v as Record<string,unknown>)
      .map(([k, w]) => `<member><name>${k}</name>${val(w)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

// Llamada XML-RPC a Odoo
async function call(model: string, method: string, args: unknown[], kwargs: Record<string,unknown> = {}): Promise<unknown> {
  // execute_kw(db, uid, password, model, method, args, kwargs)
  const params = [
    ODOO_DB,
    ODOO_UID,
    ODOO_API_KEY,
    model,
    method,
    args,      // lista de argumentos posicionales
    kwargs,    // dict de kwargs (puede ser vacío {})
  ];

  const xml = `<?xml version="1.0"?><methodCall><methodName>execute_kw</methodName><params>${
    params.map(p => `<param>${val(p)}</param>`).join('')
  }</params></methodCall>`;

  const res = await fetch(`${ODOO_URL}/xmlrpc/2/object`, {
    method:  'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body:    xml,
  });

  const text = await res.text();
  if (!text) throw new Error('Odoo devolvio respuesta vacia');

  // Detectar fault
  if (text.includes('<fault>')) {
    const msg = text.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/)?.[1]
      ?? text.match(/<string>([\s\S]*?)<\/string>/)?.[1]
      ?? 'Error Odoo';
    throw new Error(
      msg.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').substring(0, 400)
    );
  }

  // Extraer resultado (int, string, array, struct, etc.)
  return extractResult(text);
}

function extractResult(xml: string): unknown {
  // Buscar primer <param><value>...</value></param> en methodResponse
  const m = xml.match(/<methodResponse>\s*<params>\s*<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/);
  if (!m) return null;
  return parseValue(m[1].trim());
}

function parseValue(s: string): unknown {
  // int / i4
  if (/^<i[n4]>/.test(s)) return parseInt(s.replace(/<[^>]+>/g, ''));
  // double
  if (s.startsWith('<double>')) return parseFloat(s.replace(/<[^>]+>/g, ''));
  // boolean
  if (s.startsWith('<boolean>')) return s.includes('>1<');
  // nil
  if (s.startsWith('<nil/>') || s === '<nil/>') return null;
  // string
  if (s.startsWith('<string>') || s === '') {
    return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
  // array
  if (s.startsWith('<array>')) {
    const inner = s.replace(/^<array><data>/, '').replace(/<\/data><\/array>$/, '');
    const items: unknown[] = [];
    const re = /<value>([\s\S]*?)<\/value>/g;
    let m;
    while ((m = re.exec(inner)) !== null) items.push(parseValue(m[1].trim()));
    return items;
  }
  // struct
  if (s.startsWith('<struct>')) {
    const obj: Record<string, unknown> = {};
    const re = /<member>\s*<name>(.*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/g;
    let m;
    while ((m = re.exec(s)) !== null) obj[m[1]] = parseValue(m[2].trim());
    return obj;
  }
  // plain text (sin tags)
  return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}

// ── Handler Vercel ───────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ODOO_URL || !ODOO_UID || !ODOO_API_KEY || !ODOO_DB)
    return res.status(500).json({ ok: false, error: 'Variables de entorno faltantes', version: 'v7' });

  try {
    const { action, model, method, args = [], kwargs = {} } = req.body ?? {};

    // ── Test de conexión ─────────────────────────────────────
    if (action === 'test') {
      const result = await call('res.users', 'read', [[ODOO_UID]], { fields: ['name','login'] });
      return res.status(200).json({ ok: true, result, version: 'v7' });
    }

    // ── Llamada genérica ─────────────────────────────────────
    if (action === 'call_kw') {
      if (!model || !method)
        return res.status(400).json({ ok: false, error: 'Faltan model y method' });

      let finalArgs: unknown[];
      let finalKwargs: Record<string,unknown> = {};

      if (method === 'create') {
        // create recibe un dict de valores como único arg posicional
        finalArgs  = [args[0] ?? {}];
        finalKwargs = {};
      } else if (method === 'write') {
        finalArgs  = [args[0] ?? [], args[1] ?? {}];
        finalKwargs = {};
      } else if (method === 'search_read') {
        finalArgs  = [args[0] ?? []];
        finalKwargs = kwargs;
      } else if (method === 'read') {
        finalArgs  = [args[0] ?? []];
        finalKwargs = kwargs;
      } else {
        finalArgs  = args;
        finalKwargs = kwargs;
      }

      const result = await call(model, method, finalArgs, finalKwargs);
      return res.status(200).json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: `Accion no soportada: ${action}`, version: 'v7' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ ok: false, error: msg, version: 'v7' });
  }
}
