// ARCHIVO: src/features/quoter/QuoteDetail.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Edit3, ChevronDown, Loader2, CheckCircle2,
  Send, TrendingUp, Award, XCircle, Ban, MessageSquare, Download,
  FileText, Sparkles, Mail, Zap,
  Building2, Phone, Package, Gauge, Layers,
  Ruler, Users, ChevronRight, AlertCircle, MapPin,
  CalendarDays, Clock,
} from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import { sendEmail, buildQuoteEmailHTML } from '../../services/emailService';
import type { Quote, QuoteHistory, QuoteStatus } from '../../types';
import { autoRails, autoTractionLabel, generateFloorNomenclature } from '../../data/engineRules';

interface Props {
  quote:            Quote;
  sellerName:       string;
  sellerTitle:      string;
  onBack:           () => void;
  onEdit:           () => void;
  onStatusChanged:  () => void;
  onToastSuccess?:  (msg: string) => void;
  onToastError?:    (msg: string) => void;
}

const STATUS_CFG: Record<QuoteStatus, { label: string; cls: string; icon: any; dot: string; bg: string }> = {
  'Borrador':       { label: 'Borrador',       cls: 'bg-slate-100 text-slate-600 border-slate-200',     icon: FileText,   dot: '#94a3b8', bg: '#f8fafc' },
  'Enviada':        { label: 'Enviada',         cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Send,       dot: '#3b82f6', bg: '#eff6ff' },
  'En Negociación': { label: 'En Negociación',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: TrendingUp, dot: '#f59e0b', bg: '#fffbeb' },
  'Ganada':         { label: 'Ganada ✓',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Award,      dot: '#10b981', bg: '#f0fdf4' },
  'Perdida':        { label: 'Perdida',         cls: 'bg-red-50 text-red-600 border-red-200',             icon: XCircle,    dot: '#ef4444', bg: '#fef2f2' },
  'Cancelada':      { label: 'Cancelada',       cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: Ban,        dot: '#9ca3af', bg: '#f9fafb' },
};
const PIPELINE: QuoteStatus[] = ['Borrador','Enviada','En Negociación','Ganada','Perdida','Cancelada'];

const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const fmtCmp = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });

function quoteTotal(q: Quote): number {
  const isPricePerSystem = q.system_type && q.system_type !== 'Simplex';
  return isPricePerSystem ? (q.price || 0) : (q.price || 0) * q.quantity;
}

// ── Tarjeta de sección ──────────────────────────────────────
function Card({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="luxury-glass rounded-2xl overflow-hidden border border-[#D4AF37]/10 shadow-sm">
      <div className="px-5 py-3 border-b border-[#0A2463]/6 bg-[#0A2463]/3 flex items-center gap-2">
        {Icon && <Icon size={13} className="text-[#D4AF37] shrink-0" />}
        <p className="text-xs font-black text-[#0A2463] uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Fila de detalle ─────────────────────────────────────────
function Row({ label, value, gold }: { label: string; value?: any; gold?: boolean }) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[#0A2463]/5 last:border-0">
      <span className="text-xs text-[#0A2463]/45 font-medium shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right leading-snug ${gold ? 'text-[#D4AF37]' : 'text-[#0A2463]'}`}>
        {String(value)}
      </span>
    </div>
  );
}

// ── Botón descarga PDF ──────────────────────────────────────
function PDFButton({ quote, sellerName, sellerTitle }: { quote: Quote; sellerName: string; sellerTitle: string }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleDownload = async () => {
    setLoading(true); setError('');
    try {
      const { pdf }              = await import('@react-pdf/renderer');
      const { QuotePDFDocument } = await import('../pdf/QuotePDF');
      const React = await import('react');
      const { CABIN_WALLS, FLOOR_FINISHES, PLAFONOS } = await import('../../data/engineRules');
      const wallItem   = CABIN_WALLS.find((w: any) => w.label === quote.cabin_finish);
      const floorItem  = FLOOR_FINISHES.find((f: any) => f.label === quote.cabin_floor);
      const plafonItem = PLAFONOS.find((p: any) => p.id === quote.cop_model);
      const origin = window.location.origin;
      const toAbs  = (p: string) => p ? `${origin}${p}` : '';
      const element = React.createElement(QuotePDFDocument as any, {
        quote, seller: sellerName, sellerTitle,
        wallImg: toAbs(wallItem?.img || ''), floorImg: toAbs(floorItem?.img || ''), plafonImg: toAbs(plafonItem?.img || ''),
      });
      const contentBlob = await pdf(element as any).toBlob();
      const { mergeAndDownload } = await import('../../services/pdfMerge');
      await mergeAndDownload(contentBlob, quote.folio, quote.client_name,
        `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g, '_'), quote.installation_city);
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={handleDownload} disabled={loading}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all hover:bg-[#0A2463]/5 disabled:opacity-50"
      style={{ borderColor: '#0A2463', color: '#0A2463' }}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {loading ? 'Generando…' : error || 'Descargar PDF'}
    </button>
  );
}

// ── Modal debug Odoo ────────────────────────────────────────
function OdooDebugModal({ error, onClose }: { error: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(4,13,26,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative bg-white w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(239,68,68,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg,#7f1d1d,#991b1b)', borderBottom: '2px solid #ef4444' }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-300" />
            <p className="font-black text-white text-sm" style={{ fontFamily:"'Syne',sans-serif" }}>
              Error de conexión — Odoo CRM
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl px-1">✕</button>
        </div>
        <div className="p-6">
          <p className="text-xs text-[#0A2463]/50 mb-3">
            El servidor Odoo devolvió el siguiente error:
          </p>
          <pre className="bg-gray-950 text-green-400 text-xs p-4 rounded-xl overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap">
            {error}
          </pre>
          <button onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold border border-[#0A2463]/15 text-[#0A2463]/60 hover:bg-[#0A2463]/5 transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Botón Odoo CRM ──────────────────────────────────────────
function OdooButton({ quote }: { quote: Quote }) {
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState<'idle'|'ok'|'error'>('idle');
  const [msg,       setMsg]       = useState('');
  const [debugErr,  setDebugErr]  = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const sendToOdoo = async () => {
    setLoading(true); setStatus('idle'); setMsg(''); setDebugErr('');
    try {
      const { sendQuoteToOdoo } = await import('../../services/odooService');
      const { leadId, partnerId } = await sendQuoteToOdoo(quote);
      setStatus('ok'); setMsg(`✓ Lead #${leadId} (Contacto #${partnerId})`);
    } catch (e: any) {
      setStatus('error'); setMsg('Error — ver detalles');
      setDebugErr(`MENSAJE:\n${e.message}\n\nFOLIO: ${quote.folio}\nCLIENTE: ${quote.client_name}\nTIMESTAMP: ${new Date().toISOString()}`);
    } finally { setLoading(false); }
  };

  return (
    <>
      {showDebug && <OdooDebugModal error={debugErr} onClose={() => setShowDebug(false)} />}
      <div className="space-y-1">
        <button onClick={sendToOdoo} disabled={loading || status === 'ok'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: status === 'ok' ? '#10b981' : status === 'error' ? '#dc2626' : '#7C3AED',
            color: 'white', fontFamily: "'Syne', sans-serif",
            boxShadow: status === 'ok' ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
          }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
            : status === 'ok' ? <><CheckCircle2 size={15} /> Enviado a Odoo</>
            : <><Zap size={15} /> Enviar al CRM</>}
        </button>
        {msg && (
          <div className="flex items-center gap-1.5 justify-center">
            <p className={`text-xs font-medium ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>
            {status === 'error' && (
              <button onClick={() => setShowDebug(true)} className="text-xs font-bold text-red-400 underline hover:text-red-600">
                Ver error
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Envío de correo ─────────────────────────────────────────
function SendEmailButton({ quote, sellerName, sellerTitle }: { quote: Quote; sellerName: string; sellerTitle: string }) {
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState<'idle'|'ok'|'error'>('idle');
  const [msg,         setMsg]         = useState('');
  const [showZoho,    setShowZoho]    = useState(false);
  const [sendWithPDF, setSendWithPDF] = useState(false);

  const handleSend = async () => {
    if (!quote.client_email) return;
    setLoading(true); setStatus('idle'); setMsg('');
    try {
      const fmtLocal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
      const total  = quoteTotal(quote);
      const subject = `Propuesta ${quote.folio} — Elevadores Alamex`;
      const bodyHtml = buildQuoteEmailHTML({
        clientName: quote.client_name, folio: quote.folio,
        model: `${quote.model} / ${quote.use_type}`,
        total: fmtLocal.format(total), sellerName, sellerTitle,
      });
      let attachmentBase64: string | undefined;
      if (sendWithPDF) {
        const { pdf } = await import('@react-pdf/renderer');
        const { QuotePDFDocument } = await import('../pdf/QuotePDF');
        const React = await import('react');
        const element = React.createElement(QuotePDFDocument as any, { quote, seller: sellerName, sellerTitle });
        const blob = await pdf(element as any).toBlob();
        const reader = new FileReader();
        attachmentBase64 = await new Promise(resolve => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }
      await sendEmail({
        to: quote.client_email, subject, bodyHtml, attachmentBase64,
        attachmentName: sendWithPDF ? `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g,'_') : undefined,
      });
      setStatus('ok'); setMsg(`✓ Enviado a ${quote.client_email}`);
    } catch (e: any) {
      if (e.message?.includes('Zoho') || e.message?.includes('conectada')) setShowZoho(true);
      setStatus('error'); setMsg(e.message || 'Error al enviar');
    } finally { setLoading(false); }
  };

  return (
    <>
      {showZoho && <ZohoConnectLazy onClose={() => { setShowZoho(false); setStatus('idle'); setMsg(''); }} />}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={sendWithPDF} onChange={e => setSendWithPDF(e.target.checked)}
            className="w-4 h-4 accent-[#0A2463]" />
          <span className="text-xs text-[#0A2463]/50">Adjuntar PDF</span>
          <button onClick={() => setShowZoho(true)} title="Configurar Zoho"
            className="ml-auto text-[#0A2463]/30 hover:text-[#0A2463] transition-colors text-sm">⚙</button>
        </label>
        <button onClick={handleSend} disabled={loading || status === 'ok'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-50"
          style={{ background: status === 'ok' ? '#10b981' : '#0A2463', color: 'white', fontFamily: "'Syne', sans-serif" }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : status === 'ok' ? '✓ Enviado' : <><Mail size={15} /> Enviar correo</>}
        </button>
        {msg && <p className={`text-xs text-center font-medium ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
      </div>
    </>
  );
}

function ZohoConnectLazy({ onClose }: { onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ onClose: () => void }> | null>(null);
  useEffect(() => { import('../../components/ui/ZohoConnect').then(m => setComp(() => m.default)); }, []);
  if (!Comp) return null;
  return <Comp onClose={onClose} />;
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function QuoteDetail({
  quote, sellerName, sellerTitle, onBack, onEdit, onStatusChanged, onToastSuccess, onToastError,
}: Props) {
  const [current,  setCurrent]  = useState<Quote>(quote);
  const [history,  setHistory]  = useState<QuoteHistory[]>([]);
  const [loadingH, setLoadingH] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending,  setPending]  = useState<QuoteStatus | null>(null);
  const [note,     setNote]     = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    QuotesService.getHistory(current.id).then(setHistory).finally(() => setLoadingH(false));
  }, [current.id]);

  const cfg   = STATUS_CFG[current.status] ?? STATUS_CFG['Borrador'];
  const total = quoteTotal(current);
  const labor = current.labor_price || 0;
  const grand = total + labor;
  const isMRL = current.model.includes('MRL');
  const isHyd = current.model === 'HYD' || current.model === 'Home Lift';
  const isPricePerSystem = current.system_type && current.system_type !== 'Simplex';
  const quoteDate = current.project_date
    ? new Date(current.project_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const confirmChange = async () => {
    if (!pending) return;
    setChanging(true);
    try {
      const updated = await QuotesService.changeStatus(current.id, pending, note);
      setCurrent(updated);
      setHistory(await QuotesService.getHistory(current.id));
      onStatusChanged();
      onToastSuccess?.(`Estado actualizado a "${pending}".`);
    } catch (e: any) { onToastError?.('Error al cambiar estado: ' + (e?.message ?? 'Error')); }
    finally { setChanging(false); setPending(null); setNote(''); }
  };

  const extras: string[] = (() => { try { return JSON.parse(current.cabin_model || '[]'); } catch { return []; } })();
  const isExtrasJSON = Array.isArray(extras) && extras.length > 0 && typeof extras[0] === 'string' && extras[0].includes('-');
  const extraLabels = isExtrasJSON ? extras.map((e: string) =>
    ({ 'panoramico':'Panel panorámico','espejo-trasero':'Espejo trasero','espejo-lateral':'Espejo lateral',
       'pasamanos-inox':'Pasamanos INOX','pasamanos-crom':'Pasamanos cromado','led-premium':'Iluminación LED' })[e] || e
  ) : [];

  const MODEL_LABELS: Record<string, string> = {
    'MR': 'Con Cuarto de Máquinas', 'MRL-L': 'Sin Cuarto · Chasis L',
    'MRL-G': 'Sin Cuarto · Chasis G', 'HYD': 'Hidráulico', 'Home Lift': 'Home Lift Residencial',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* ── HEADER ── */}
      <div className="relative z-10 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-2 bg-white/60 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 rounded-xl text-[#0A2463]/50 hover:text-[#0A2463] hover:bg-[#0A2463]/5 transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-black text-[#0A2463] flex items-center gap-2 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
              <Sparkles size={14} className="text-[#D4AF37] shrink-0" />
              {current.folio}
            </h1>
            <p className="text-xs text-[#0A2463]/50 font-medium truncate">{current.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${cfg.cls}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              <span className="hidden sm:inline">{cfg.label}</span>
              <ChevronDown size={11} style={{ transform: menuOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-2xl p-2 z-50 min-w-[190px]"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                {PIPELINE.map(s => {
                  const sc = STATUS_CFG[s];
                  return (
                    <button key={s}
                      onClick={() => { if (s !== current.status) setPending(s); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-0.5 transition-all ${s === current.status ? sc.cls : 'hover:bg-[#0A2463]/5 text-[#0A2463]/60'}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.dot }} />
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all hover:bg-[#0A2463]/5"
            style={{ borderColor: '#0A2463', color: '#0A2463' }}>
            <Edit3 size={13} />
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>
      </div>

      {/* Modal cambio de estado */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="luxury-glass rounded-3xl p-7 max-w-md w-full mx-4 border border-[#D4AF37]/20 shadow-2xl">
            <h3 className="font-black text-xl text-[#0A2463] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
              Cambiar estado
            </h3>
            <div className="flex items-center gap-2 mb-5">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CFG[current.status]?.cls}`}>
                {STATUS_CFG[current.status]?.label}
              </span>
              <ChevronRight size={14} className="text-[#0A2463]/30" />
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CFG[pending]?.cls}`}>
                {STATUS_CFG[pending]?.label}
              </span>
            </div>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Nota opcional (acuerdos, motivos, próximo paso…)"
              className="w-full px-4 py-3 rounded-xl text-sm border border-[#0A2463]/15 outline-none bg-white resize-none mb-4 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 text-[#0A2463]" />
            <div className="flex gap-3">
              <button onClick={() => { setPending(null); setNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-[#0A2463]/20 text-[#0A2463]/60 hover:bg-[#0A2463]/5 transition-all">
                Cancelar
              </button>
              <button onClick={confirmChange} disabled={changing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40"
                style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
                {changing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY scrollable ── */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

          {/* ══ HERO CARD — identidad de la oportunidad ══ */}
          <div className="rounded-2xl overflow-hidden shadow-lg"
            style={{ background: 'linear-gradient(135deg, #051338 0%, #0A2463 60%, #1B3A6B 100%)' }}>

            <div className="p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">

                {/* Izquierda: cliente + descripción del equipo */}
                <div className="flex-1 min-w-0">
                  {/* Status + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                      {cfg.label}
                    </span>
                    {current.system_type && current.system_type !== 'Simplex' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                        {current.system_type}
                      </span>
                    )}
                    <span className="text-[11px] text-white/30 font-mono">{current.folio}</span>
                  </div>

                  {/* Nombre del cliente */}
                  <p className="text-2xl sm:text-3xl font-black text-[#D4AF37] leading-tight mb-1"
                    style={{ fontFamily: "'Syne', sans-serif" }}>
                    {current.client_name}
                  </p>

                  {/* Lugar + fecha */}
                  <div className="flex items-center gap-4 flex-wrap mb-4">
                    {current.installation_city && (
                      <span className="flex items-center gap-1 text-sm text-white/50">
                        <MapPin size={12} /> {current.installation_city}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-white/40">
                      <CalendarDays size={12} /> {quoteDate}
                    </span>
                  </div>

                  {/* Descripción del elevador */}
                  <div className="bg-white/8 rounded-xl px-4 py-3 border border-white/10">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">
                      {isPricePerSystem ? `Sistema ${current.system_type}` : `${current.quantity} Equipo${current.quantity > 1 ? 's'  : ''}`}
                    </p>
                    <p className="text-white font-black text-lg sm:text-xl leading-tight"
                      style={{ fontFamily: "'Syne', sans-serif" }}>
                      {current.model} — {current.use_type}
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      {MODEL_LABELS[current.model] || current.model}
                    </p>
                    {/* Tags de specs */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        `${current.capacity} kg / ${current.persons} pers.`,
                        `${current.stops} paradas`,
                        `${current.speed} m/s`,
                        `${((current.travel||0)/1000).toFixed(1)} m recorrido`,
                      ].map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/70 border border-white/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Derecha: precio */}
                {grand > 0 && (
                  <div className="sm:w-56 shrink-0">
                    <div className="bg-white/8 rounded-xl p-4 border border-white/10 h-full">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/70 mb-1">
                        {isPricePerSystem ? 'Precio del sistema' : grand === total ? 'Precio sin IVA' : 'Total (equipo + M.O.)'}
                      </p>
                      <p className="font-black text-[#D4AF37] leading-none mb-1"
                        style={{ fontSize: grand >= 1000000 ? '1.75rem' : '2rem', fontFamily: "'Syne', sans-serif" }}>
                        {fmtCmp.format(grand)}
                      </p>
                      <p className="text-white/40 text-xs mb-3">{current.currency || 'MXN'}</p>
                      <div className="h-px bg-white/10 mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/40">Con IVA (16%)</span>
                          <span className="text-white/70 font-bold">{fmtCmp.format(grand * 1.16)}</span>
                        </div>
                        {labor > 0 && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/40">Equipo</span>
                              <span className="text-white/60">{fmtCmp.format(total)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/40">Mano de obra</span>
                              <span className="text-white/60">{fmtCmp.format(labor)}</span>
                            </div>
                          </>
                        )}
                        {!isPricePerSystem && current.quantity > 1 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Precio unit.</span>
                            <span className="text-white/60">{fmtCmp.format(current.price || 0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ BODY: 2 cols (detalles + acciones/historial) ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Col izquierda: detalles (2/3) ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Cliente */}
              <Card title="Cliente" icon={Building2}>
                <div className="space-y-0">
                  <Row label="Nombre"   value={current.client_name} gold />
                  <Row label="Email"    value={current.client_email} />
                  <Row label="Teléfono" value={current.client_phone} />
                  <Row label="Ciudad de instalación" value={current.installation_city} />
                  <Row label="Fecha de propuesta" value={quoteDate} />
                </div>
              </Card>

              {/* Especificaciones del equipo */}
              <Card title="Especificaciones del equipo" icon={Package}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Modelo"    value={`${current.model} — ${current.use_type}`} />
                    <Row label="Sistema"   value={current.system_type || 'Simplex'} />
                    <Row label="Capacidad" value={`${current.capacity} kg / ${current.persons} personas`} />
                    <Row label="Paradas"   value={`${current.stops} niveles`} />
                    <Row label="Velocidad" value={`${current.speed} m/s`} />
                    <Row label="Recorrido" value={`${((current.travel||0)/1000).toFixed(1)} m`} />
                  </div>
                  <div>
                    <Row label="Cubo (F × F)" value={`${current.shaft_width} × ${current.shaft_depth} mm`} />
                    {!isMRL && !isHyd && <Row label="Foso" value={`${current.pit} mm`} />}
                    {!isMRL && !isHyd && <Row label="Sobrepaso" value={`${current.overhead} mm`} />}
                    <Row label="Tracción"  value={autoTractionLabel(current.model, String(current.speed))} />
                    <Row label="Rieles cabina"       value={autoRails(current.model).cabin} />
                    <Row label="Rieles contrapeso"   value={autoRails(current.model).counterweight} />
                    <Row label="Normativa" value={current.norm} />
                  </div>
                </div>
              </Card>

              {/* Cabina */}
              <Card title="Acabados de cabina" icon={Ruler}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Paredes"    value={current.cabin_finish} />
                    <Row label="Piso"       value={current.cabin_floor} />
                    <Row label="Plafón/COP" value={current.cop_model} />
                  </div>
                  <div>
                    <Row label="Puerta"     value={current.door_type} />
                    <Row label="Paso libre" value={`${current.door_width} × ${current.door_height} mm`} />
                    <Row label="Control"    value={current.control_group || 'Punto Matriz'} />
                  </div>
                </div>
                {extraLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-3 mt-2 border-t border-[#0A2463]/6">
                    {extraLabels.map((ex: string) => (
                      <span key={ex} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0A2463]/8 text-[#0A2463]">
                        {ex}
                      </span>
                    ))}
                  </div>
                )}
              </Card>

              {/* Condiciones comerciales */}
              {current.commercial_terms && (
                <Card title="Condiciones comerciales" icon={CalendarDays}>
                  <div className="space-y-0">
                    <Row label="Tiempo de entrega" value={current.commercial_terms.deliveryTime} />
                    <Row label="Garantía"          value={current.commercial_terms.warranty} />
                    <Row label="Validez"           value={current.commercial_terms.validity} />
                    <Row label="Condiciones"       value={current.commercial_terms.generalConditions} />
                  </div>
                </Card>
              )}

              {/* Notas internas */}
              {current.internal_notes && (
                <div className="rounded-2xl p-4 border border-amber-200/60 bg-amber-50/60">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertCircle size={12} /> Notas internas
                  </p>
                  <p className="text-sm text-[#0A2463]/70 leading-relaxed">{current.internal_notes}</p>
                </div>
              )}
            </div>

            {/* ── Col derecha: acciones + historial (1/3) ── */}
            <div className="space-y-4">

              {/* Acciones */}
              <Card title="Acciones" icon={Zap}>
                <div className="space-y-3">
                  {/* PDF + Editar en fila */}
                  <div className="flex gap-2">
                    <PDFButton quote={current} sellerName={sellerName} sellerTitle={sellerTitle} />
                  </div>

                  {/* Odoo CRM */}
                  <OdooButton quote={current} />

                  {/* Email si tiene */}
                  {current.client_email && (
                    <div className="pt-2 border-t border-[#0A2463]/6">
                      <p className="text-xs font-bold text-[#0A2463]/40 uppercase tracking-widest mb-2">
                        Correo — {current.client_email}
                      </p>
                      <SendEmailButton quote={current} sellerName={sellerName} sellerTitle={sellerTitle} />
                    </div>
                  )}

                  {/* Llamar si tiene */}
                  {current.client_phone && (
                    <a href={`tel:${current.client_phone}`}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all group">
                      <Phone size={15} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold">Llamar</p>
                        <p className="text-xs text-emerald-600/70 truncate">{current.client_phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              </Card>

              {/* Historial de estados */}
              <Card title="Historial" icon={Clock}>
                {loadingH ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex items-center gap-2 py-2">
                    <MessageSquare size={14} className="text-[#0A2463]/25" />
                    <p className="text-sm text-[#0A2463]/40">Sin movimientos aún</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Línea vertical del timeline */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#0A2463]/10" />
                    <div className="space-y-4">
                      {history.map((h, i) => {
                        const sc = STATUS_CFG[h.to_status as QuoteStatus] ?? STATUS_CFG['Borrador'];
                        return (
                          <div key={h.id} className="flex gap-3 items-start relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 z-10 ${sc.cls}`}
                              style={{ background: i === 0 ? sc.bg : 'white' }}>
                              <sc.icon size={10} />
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-sm font-bold text-[#0A2463]">{sc.label}</span>
                                <span className="text-xs text-[#0A2463]/35 shrink-0">
                                  {new Date(h.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                              <p className="text-xs text-[#D4AF37]/80 font-medium">{h.user_name}</p>
                              {h.note && (
                                <p className="text-xs text-[#0A2463]/50 mt-0.5 leading-snug">{h.note}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
