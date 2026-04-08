// ARCHIVO: src/features/quoter/QuoteDetail.tsx
// Vista de seguimiento rediseñada — datos destacados, historial rico,
// botón "Enviar al CRM de Odoo" con configuración via variables de entorno

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit3, ChevronDown, Loader2, CheckCircle2, Clock,
  Send, TrendingUp, Award, XCircle, Ban, MessageSquare, Download,
  FileText, DollarSign, Sparkles, Mail, Zap,
  Building2, Phone, CalendarDays, Package, Gauge, Layers,
  Ruler, Users, ChevronRight, AlertCircle
} from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import { sendEmail, buildQuoteEmailHTML } from '../../services/emailService';
import type { Quote, QuoteHistory, QuoteStatus } from '../../types';
import { autoRails, autoTractionLabel, generateFloorNomenclature } from '../../data/engineRules';

interface Props {
  quote:           Quote;
  sellerName:      string;
  sellerTitle:     string;
  onBack:          () => void;
  onEdit:          () => void;
  onStatusChanged: () => void;
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
const fmtIVA = (v: number) => fmt.format(v * 1.16);

// ── Stat card destacada ─────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: any; label: string; value: string; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="luxury-glass rounded-2xl p-4 border border-[#D4AF37]/10 shadow-sm flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#0A2463]/40 uppercase tracking-wider">{label}</p>
        <p className="font-black text-base text-[#0A2463] leading-tight mt-0.5 truncate"
          style={{ fontFamily: "'Syne', sans-serif" }}>{value}</p>
        {sub && <p className="text-[10px] text-[#0A2463]/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Fila de detalle ─────────────────────────────────────────
function DetailRow({ label, value, highlight }: { label: string; value?: any; highlight?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#0A2463]/5 last:border-0">
      <span className="text-xs font-medium text-[#0A2463]/45">{label}</span>
      <span className={`text-xs font-semibold text-right max-w-[55%] truncate ${highlight ? 'text-[#D4AF37]' : 'text-[#0A2463]'}`}>
        {String(value)}
      </span>
    </div>
  );
}

// ── Botón de descarga PDF ───────────────────────────────────
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
      const toAbs  = (path: string) => path ? `${origin}${path}` : '';
      const element = React.createElement(QuotePDFDocument as any, {
        quote, seller: sellerName, sellerTitle,
        wallImg:   toAbs(wallItem?.img  || ''),
        floorImg:  toAbs(floorItem?.img || ''),
        plafonImg: toAbs(plafonItem?.img || ''),
      });
      const contentBlob = await pdf(element as any).toBlob();
      const { mergeAndDownload } = await import('../../services/pdfMerge');
      await mergeAndDownload(contentBlob, quote.folio, quote.client_name,
        `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g, '_'));
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={handleDownload} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
      style={{ borderColor: '#0A2463', color: '#0A2463', background: 'white' }}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      {loading ? 'Generando...' : error || 'Descargar PDF'}
    </button>
  );
}

// ── Botón Enviar a Odoo CRM ──────────────────────────────────
// Llama al API Route /api/odoo (Vercel serverless).
// Sin configuración por usuario — credenciales en variables de entorno del servidor.
function OdooButton({ quote }: { quote: Quote }) {
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg,     setMsg]     = useState('');

  const sendToOdoo = async () => {
    setLoading(true); setStatus('idle'); setMsg('');
    try {
      const { sendQuoteToOdoo } = await import('../../services/odooService');
      const { leadId } = await sendQuoteToOdoo(quote);
      setStatus('ok');
      setMsg(`✓ Oportunidad ${leadId} creada en Odoo CRM`);
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message || 'Error de conexión con Odoo');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-1">
      <button onClick={sendToOdoo} disabled={loading || status === 'ok'}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        style={{
          background: status === 'ok' ? '#10b981' : '#7C3AED',
          color: 'white',
          fontFamily: "'Syne', sans-serif",
          boxShadow: status === 'ok' ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
        }}>
        {loading
          ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
          : status === 'ok'
          ? <><CheckCircle2 size={13} /> Enviado a Odoo</>
          : <><Zap size={13} /> Enviar al CRM</>}
      </button>
      {msg && (
        <p className={`text-[10px] font-medium ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}


// ── Botón de envío de correo con Zoho ─────────────────────
function SendEmailButton({ quote, sellerName, sellerTitle }: { quote: Quote; sellerName: string; sellerTitle: string }) {
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg,         setMsg]         = useState('');
  const [showZoho,    setShowZoho]    = useState(false);
  const [sendWithPDF, setSendWithPDF] = useState(false);

  const handleSend = async () => {
    if (!quote.client_email) return;
    setLoading(true); setStatus('idle'); setMsg('');
    try {
      const fmt   = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
      const total = (quote.price || 0) * (quote.quantity || 1);

      const subject = `Propuesta ${quote.folio} — Elevadores Alamex`;
      const bodyHtml = buildQuoteEmailHTML({
        clientName:  quote.client_name,
        folio:       quote.folio,
        model:       `${quote.model} / ${quote.use_type}`,
        total:       fmt.format(total),
        sellerName,
        sellerTitle,
      });

      // Opcional: adjuntar el PDF
      let attachmentBase64: string | undefined;
      if (sendWithPDF) {
        const { pdf }              = await import('@react-pdf/renderer');
        const { QuotePDFDocument } = await import('../pdf/QuotePDF');
        const React = await import('react');
        const element = React.createElement(QuotePDFDocument as any, { quote, seller: sellerName, sellerTitle });
        const blob    = await pdf(element as any).toBlob();
        const reader  = new FileReader();
        attachmentBase64 = await new Promise(resolve => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }

      await sendEmail({
        to:               quote.client_email,
        subject,
        bodyHtml,
        attachmentBase64,
        attachmentName:   sendWithPDF ? `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g,'_') : undefined,
      });

      setStatus('ok');
      setMsg(`✓ Correo enviado a ${quote.client_email}`);
    } catch (e: any) {
      if (e.message?.includes('Zoho') || e.message?.includes('zoho') || e.message?.includes('conectada')) {
        setShowZoho(true);
      }
      setStatus('error');
      setMsg(e.message || 'Error al enviar');
    } finally { setLoading(false); }
  };

  return (
    <>
      {showZoho && (
        <ZohoConnectLazy onClose={() => { setShowZoho(false); setStatus('idle'); setMsg(''); }} />
      )}
      <div className="luxury-glass rounded-2xl p-4 border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0A2463]">Enviar propuesta</p>
            <p className="text-[10px] text-[#0A2463]/40 truncate">{quote.client_email}</p>
          </div>
          <button onClick={() => setShowZoho(true)} title="Configurar Zoho"
            className="text-[#0A2463]/30 hover:text-[#0A2463] transition-colors text-sm">⚙</button>
        </div>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input type="checkbox" checked={sendWithPDF} onChange={e => setSendWithPDF(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#0A2463]" />
          <span className="text-[10px] text-[#0A2463]/50">Adjuntar PDF de la propuesta</span>
        </label>
        <button onClick={handleSend} disabled={loading || status === 'ok'}
          className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all disabled:opacity-50"
          style={{ background: status === 'ok' ? '#10b981' : '#0A2463', color: 'white', fontFamily: "'Syne', sans-serif" }}>
          {loading ? 'Enviando...' : status === 'ok' ? '✓ Enviado' : 'Enviar correo'}
        </button>
        {msg && (
          <p className={`text-[10px] mt-1.5 text-center font-medium ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
            {msg}
          </p>
        )}
      </div>
    </>
  );
}

function ZohoConnectLazy({ onClose }: { onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ onClose: () => void }> | null>(null);
  useEffect(() => {
    import('../../components/ui/ZohoConnect').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return null;
  return <Comp onClose={onClose} />;
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function QuoteDetail({ quote, sellerName, sellerTitle, onBack, onEdit, onStatusChanged }: Props) {
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
  const total = (current.price || 0) * (current.quantity || 1);
  const isMRL = current.model.includes('MRL');
  const isHyd = current.model === 'HYD' || current.model === 'Home Lift';

  const confirmChange = async () => {
    if (!pending) return;
    setChanging(true);
    try {
      const updated = await QuotesService.changeStatus(current.id, pending, note);
      setCurrent(updated);
      setHistory(await QuotesService.getHistory(current.id));
      onStatusChanged();
    } catch (e: any) { alert('Error: ' + e?.message); }
    finally { setChanging(false); setPending(null); setNote(''); }
  };

  // Extras de cabina
  const extras: string[] = (() => { try { return JSON.parse(current.cabin_model || '[]'); } catch { return []; } })();
  const isExtrasJSON = Array.isArray(extras) && extras.length > 0 && typeof extras[0] === 'string' && extras[0].includes('-');
  const extraLabels = isExtrasJSON ? extras.map((e: string) =>
    e === 'panoramico' ? 'Panel panorámico' :
    e === 'espejo-trasero' ? 'Espejo trasero' :
    e === 'espejo-lateral' ? 'Espejo lateral' :
    e === 'pasamanos-inox' ? 'Pasamanos INOX' :
    e === 'pasamanos-crom' ? 'Pasamanos cromado' :
    e === 'led-premium'    ? 'Iluminación LED' : e
  ) : [];

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* ── HEADER ── */}
      <div className="relative z-10 px-6 py-4 shrink-0 flex items-center justify-between bg-white/60 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-[#0A2463]/50 hover:text-[#0A2463] hover:bg-[#0A2463]/5 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#0A2463] flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              <Sparkles size={16} className="text-[#D4AF37]" />
              {current.folio}
            </h1>
            <p className="text-[11px] text-[#0A2463]/50 mt-0.5 font-medium">{current.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OdooButton quote={current} />
          <PDFButton quote={current} sellerName={sellerName} sellerTitle={sellerTitle} />
          <button onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
            style={{ borderColor: '#0A2463', color: '#0A2463', background: 'white' }}>
            <Edit3 size={13} /> Editar
          </button>

          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${cfg.cls}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
              <ChevronDown size={12} style={{ transform: menuOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-2xl p-2 z-50 min-w-[200px]"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                {PIPELINE.map(s => {
                  const sc = STATUS_CFG[s];
                  return (
                    <button key={s}
                      onClick={() => { if (s !== current.status) setPending(s); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold mb-1 transition-all ${s === current.status ? sc.cls : 'hover:bg-[#0A2463]/5 text-[#0A2463]/60'}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.dot }} />
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal cambio de estado */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="luxury-glass rounded-3xl p-7 max-w-md w-full mx-4 border border-[#D4AF37]/20 shadow-2xl">
            <h3 className="font-black text-lg text-[#0A2463] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
              Cambiar estado
            </h3>
            <div className="flex items-center gap-2 mb-5">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_CFG[current.status]?.cls}`}>
                {STATUS_CFG[current.status]?.label}
              </span>
              <ChevronRight size={14} className="text-[#0A2463]/30" />
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_CFG[pending]?.cls}`}>
                {STATUS_CFG[pending]?.label}
              </span>
            </div>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Nota opcional (acuerdos, motivos, próximo paso...)"
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

      {/* ── BODY ── */}
      <div className="flex-1 overflow-hidden flex relative z-10">

        {/* ── LEFT PANEL — KPIs + acciones + historial ── */}
        <div className="w-[360px] shrink-0 border-r border-[#0A2463]/8 overflow-y-auto p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.5)' }}>

          {/* Precio destacado */}
          {total > 0 && (
            <div className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #0A2463 0%, #1B3A6B 100%)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Inversión total</p>
              <p className="font-black text-3xl text-[#D4AF37]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {fmt.format(total)}
              </p>
              <p className="text-[10px] text-white/40 mt-1">Con IVA (16%): {fmtIVA(total)}</p>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-white/40">Cantidad</p>
                  <p className="text-sm font-bold text-white">{current.quantity} equipo{current.quantity > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/40">Precio unit.</p>
                  <p className="text-sm font-bold text-white">{fmt.format(current.price || 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* KPI cards — 2 columnas, texto completo */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Package,  label: 'Modelo',    value: current.model,                   color: '#0A2463', bg: '#EBF0FB' },
              { icon: Users,    label: 'Capacidad', value: `${current.capacity} kg`,         color: '#7C3AED', bg: '#F5F3FF', sub: `${current.persons} personas` },
              { icon: Layers,   label: 'Paradas',   value: `${current.stops} niveles`,       color: '#0891b2', bg: '#E0F2FE' },
              { icon: Gauge,    label: 'Velocidad', value: `${current.speed} m/s`,           color: '#059669', bg: '#ECFDF5' },
            ].map(({ icon: Icon, label, value, color, bg, sub }) => (
              <div key={label} className="luxury-glass rounded-xl p-3 border border-[#D4AF37]/10 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <p className="text-[9px] font-bold text-[#0A2463]/40 uppercase tracking-wider">{label}</p>
                </div>
                <p className="font-black text-sm text-[#0A2463] leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {value}
                </p>
                {sub && <p className="text-[9px] text-[#0A2463]/40 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Historial mini — panel izquierdo */}
          <div>
            <div className="h-px bg-[#0A2463]/8 mb-3" />
            {loadingH ? (
              <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-[#D4AF37]" /></div>
            ) : history.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0A2463]/4">
                <MessageSquare size={12} className="text-[#0A2463]/25" />
                <p className="text-[10px] text-[#0A2463]/40">Sin movimientos aún</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((h) => {
                  const sc = STATUS_CFG[h.to_status as QuoteStatus] ?? STATUS_CFG['Borrador'];
                  return (
                    <div key={h.id} className="flex gap-2 items-start">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${sc.cls}`}>
                        <sc.icon size={9} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold text-[#0A2463]">{sc.label}</span>
                          <span className="text-[8px] text-[#0A2463]/30 shrink-0">
                            {new Date(h.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#D4AF37] font-medium truncate">{h.user_name}</p>
                        {h.note && <p className="text-[9px] text-[#0A2463]/50 truncate">{h.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL — Info detallada de la oportunidad ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-full">

            {/* Título */}
            <h2 className="text-lg font-black text-[#0A2463] mb-4 flex items-center gap-2"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              <Sparkles size={16} className="text-[#D4AF37]" />
              Detalle de la oportunidad
            </h2>

            {/* Grid de 3 columnas con toda la info */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">

              {/* Col 1 — Cliente */}
              <div className="luxury-glass rounded-2xl overflow-hidden border border-[#D4AF37]/10">
                <div className="px-4 py-2.5 border-b border-[#0A2463]/6 bg-[#0A2463]/3 flex items-center gap-2">
                  <Building2 size={11} className="text-[#D4AF37]" />
                  <p className="text-[9px] font-black text-[#0A2463] uppercase tracking-widest">Cliente</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div>
                    <p className="text-[10px] text-[#0A2463]/40 mb-0.5 uppercase tracking-wide">Nombre</p>
                    <p className="text-sm font-bold text-[#D4AF37] leading-tight">{current.client_name}</p>
                  </div>
                  {current.client_email && <div>
                    <p className="text-[10px] text-[#0A2463]/40 mb-0.5 uppercase tracking-wide">Email</p>
                    <p className="text-xs font-medium text-[#0A2463]">{current.client_email}</p>
                  </div>}
                  {current.client_phone && <div>
                    <p className="text-[10px] text-[#0A2463]/40 mb-0.5 uppercase tracking-wide">Teléfono</p>
                    <p className="text-xs font-medium text-[#0A2463]">{current.client_phone}</p>
                  </div>}
                  <div>
                    <p className="text-[10px] text-[#0A2463]/40 mb-0.5 uppercase tracking-wide">Fecha</p>
                    <p className="text-xs font-medium text-[#0A2463]">{current.project_date}</p>
                  </div>
                </div>
              </div>

              {/* Col 2 — Equipo */}
              <div className="luxury-glass rounded-2xl overflow-hidden border border-[#D4AF37]/10">
                <div className="px-4 py-2.5 border-b border-[#0A2463]/6 bg-[#0A2463]/3 flex items-center gap-2">
                  <Package size={11} className="text-[#D4AF37]" />
                  <p className="text-[9px] font-black text-[#0A2463] uppercase tracking-widest">Equipo</p>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {[
                    ['Modelo',    `${current.model} · ${current.use_type}`],
                    ['Capacidad', `${current.capacity} kg / ${current.persons} pers.`],
                    ['Paradas',   `${current.stops} niveles`],
                    ['Velocidad', `${current.speed} m/s`],
                    ['Recorrido', `${((current.travel||0)/1000).toFixed(1)} m`],
                    ['Cubo',      `${current.shaft_width}×${current.shaft_depth} mm`],
                    ['Tracción',  autoTractionLabel(current.model, String(current.speed))],
                    ['Normativa', current.norm],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-1">
                      <span className="text-[9px] text-[#0A2463]/40 shrink-0">{label}</span>
                      <span className="text-[9px] font-semibold text-[#0A2463] text-right truncate max-w-[110px]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 3 — Cabina + Precio */}
              <div className="space-y-3">
                <div className="luxury-glass rounded-2xl overflow-hidden border border-[#D4AF37]/10">
                  <div className="px-4 py-2.5 border-b border-[#0A2463]/6 bg-[#0A2463]/3 flex items-center gap-2">
                    <Ruler size={11} className="text-[#D4AF37]" />
                    <p className="text-[9px] font-black text-[#0A2463] uppercase tracking-widest">Cabina</p>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {[
                      ['Paredes',  current.cabin_finish || '—'],
                      ['Piso',     current.cabin_floor  || '—'],
                      ['Plafón',   current.cop_model    || '—'],
                      ['Puerta',   current.door_type    || '—'],
                      ['Paso',     `${current.door_width}×${current.door_height} mm`],
                      ['Rieles',   `${autoRails(current.model).cabin}/${autoRails(current.model).counterweight}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-1">
                        <span className="text-[9px] text-[#0A2463]/40 shrink-0">{label}</span>
                        <span className="text-[9px] font-semibold text-[#0A2463] text-right truncate max-w-[100px]">{value}</span>
                      </div>
                    ))}
                    {extraLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {extraLabels.map((ex: string) => (
                          <span key={ex} className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#0A2463]/8 text-[#0A2463]">{ex}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </div>

            {/* Notas internas si las hay */}
            {current.internal_notes && (
              <div className="luxury-glass rounded-2xl p-4 border border-amber-200/50 mb-4">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <AlertCircle size={10} /> Notas internas
                </p>
                <p className="text-xs text-[#0A2463]/70 leading-relaxed">{current.internal_notes}</p>
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {current.client_email && (
                <SendEmailButton quote={current} sellerName={sellerName} sellerTitle={sellerTitle} />
              )}
              {current.client_phone && (
                <a href={`tel:${current.client_phone}`}
                  className="luxury-glass rounded-2xl p-4 border border-[#D4AF37]/10 flex items-center gap-3 hover:border-[#D4AF37]/30 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Phone size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0A2463] group-hover:text-[#D4AF37] transition-colors">Llamar</p>
                    <p className="text-[10px] text-[#0A2463]/40">{current.client_phone}</p>
                  </div>
                </a>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
