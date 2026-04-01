// ARCHIVO: src/features/quoter/QuoteDetail.tsx
// Diseño consistente con el dashboard — fondo beige, luxury-glass cards,
// #0A2463 + #D4AF37, tipografía Syne

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit3, ChevronDown, Loader2, CheckCircle2, Clock,
  Send, TrendingUp, Award, XCircle, Ban, MessageSquare, Download,
  FileText, User, Settings2, DollarSign, Sparkles, Mail
} from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
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

const STATUS_CFG: Record<QuoteStatus, { label: string; cls: string; icon: any; dot: string }> = {
  'Borrador':       { label: 'Borrador',       cls: 'bg-slate-100 text-slate-600 border-slate-200',     icon: FileText,   dot: '#94a3b8' },
  'Enviada':        { label: 'Enviada',         cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Send,       dot: '#3b82f6' },
  'En Negociación': { label: 'En Negociación',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: TrendingUp, dot: '#f59e0b' },
  'Ganada':         { label: 'Ganada ✓',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Award,      dot: '#10b981' },
  'Perdida':        { label: 'Perdida',         cls: 'bg-red-50 text-red-600 border-red-200',             icon: XCircle,    dot: '#ef4444' },
  'Cancelada':      { label: 'Cancelada',       cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: Ban,        dot: '#9ca3af' },
};

const PIPELINE: QuoteStatus[] = ['Borrador','Enviada','En Negociación','Ganada','Perdida','Cancelada'];
const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

function InfoRow({ label, value }: { label: string; value?: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#0A2463]/5 last:border-0">
      <span className="text-[11px] font-medium text-[#0A2463]/50 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-[#0A2463] text-right max-w-[60%] truncate">{String(value)}</span>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="luxury-glass rounded-2xl overflow-hidden border border-[#D4AF37]/10 shadow-sm mb-4">
      <div className="px-4 py-3 border-b border-[#0A2463]/6 bg-white/50">
        <p className="text-[10px] font-black text-[#0A2463] uppercase tracking-[0.15em] flex items-center gap-2">
          {Icon && <Icon size={12} className="text-[#D4AF37]" />}
          {title}
        </p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ── PDFButton ────────────────────────────────────────────────
function PDFButton({ quote, sellerName, sellerTitle }: { quote: Quote; sellerName: string; sellerTitle: string }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleDownload = async () => {
    setLoading(true); setError('');
    try {
      const { pdf }              = await import('@react-pdf/renderer');
      const { QuotePDFDocument } = await import('../pdf/QuotePDF');
      const React = await import('react');
      const element = React.createElement(QuotePDFDocument as any, { quote, seller: sellerName, sellerTitle });
      const contentBlob = await pdf(element as any).toBlob();
      const { mergeAndDownload } = await import('../../services/pdfMerge');
      const filename = `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g, '_');
      await mergeAndDownload(contentBlob, quote.folio, quote.client_name, filename);
    } catch (e: any) {
      console.error(e); setError(e?.message || 'Error al generar PDF');
    } finally { setLoading(false); }
  };

  return (
    <button onClick={handleDownload} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all"
      style={{ borderColor: '#0A2463', color: '#0A2463', background: 'white' }}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      {loading ? 'Generando...' : error || 'Descargar PDF'}
    </button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
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

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* Header */}
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

        <div className="flex items-center gap-3">
          <PDFButton quote={current} sellerName={sellerName} sellerTitle={sellerTitle} />
          <button onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all"
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
              <div className="absolute right-0 top-full mt-2 rounded-2xl p-2 z-50 min-w-[200px] animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                {PIPELINE.map(s => {
                  const sc = STATUS_CFG[s];
                  return (
                    <button key={s}
                      onClick={() => { if (s !== current.status) { setPending(s); } setMenuOpen(false); }}
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
          <div className="luxury-glass rounded-3xl p-7 max-w-md w-full mx-4 border border-[#D4AF37]/20 shadow-2xl animate-fade-in">
            <h3 className="font-black text-lg text-[#0A2463] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
              Cambiar estado
            </h3>
            <div className="flex items-center gap-2 mb-5">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_CFG[current.status]?.cls}`}>
                {STATUS_CFG[current.status]?.label}
              </span>
              <span className="text-[#0A2463]/40 text-xs">→</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_CFG[pending]?.cls}`}>
                {STATUS_CFG[pending]?.label}
              </span>
            </div>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Nota opcional (acuerdos, motivos, próximo paso...)"
              className="w-full px-4 py-3 rounded-xl text-sm border border-[#0A2463]/15 outline-none bg-white resize-none mb-4
                focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 text-[#0A2463]" />
            <div className="flex gap-3">
              <button onClick={() => { setPending(null); setNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-[#0A2463]/20 text-[#0A2463]/60 hover:bg-[#0A2463]/5 transition-all">
                Cancelar
              </button>
              <button onClick={confirmChange} disabled={changing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
                {changing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden flex relative z-10">

        {/* Sidebar izquierdo */}
        <div className="w-[300px] shrink-0 border-r border-[#0A2463]/8 overflow-y-auto p-4"
          style={{ background: 'rgba(255,255,255,0.5)' }}>

          {/* Precio destacado si tiene */}
          {current.price > 0 && (
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: '#0A2463' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1">
                Inversión total
              </p>
              <p className="font-black text-2xl text-[#D4AF37]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {fmt.format(total)}
              </p>
              <p className="text-[10px] text-white/40 mt-1">
                Con IVA: {fmt.format(total * 1.16)}
              </p>
            </div>
          )}

          <Card title="Cliente" icon={User}>
            <InfoRow label="Nombre" value={current.client_name} />
            <InfoRow label="Email"  value={current.client_email} />
            <InfoRow label="Tel."   value={current.client_phone} />
            <InfoRow label="Fecha"  value={current.project_date} />
          </Card>

          <Card title="Equipo" icon={Settings2}>
            <InfoRow label="Modelo"    value={current.model} />
            <InfoRow label="Uso"       value={current.use_type} />
            <InfoRow label="Capacidad" value={`${current.capacity} kg`} />
            <InfoRow label="Personas"  value={current.persons} />
            <InfoRow label="Velocidad" value={`${current.speed} m/s`} />
            <InfoRow label="Paradas"   value={current.stops} />
            <InfoRow label="Cantidad"  value={`${current.quantity} equipo(s)`} />
            <InfoRow label="Recorrido" value={`${((current.travel||0)/1000).toFixed(1)} m`} />
            {!isMRL && !isHyd && <InfoRow label="Fosa"    value={`${current.pit} mm`} />}
            {!isMRL && !isHyd && <InfoRow label="Huida"   value={`${current.overhead} mm`} />}
            <InfoRow label="Cubo"      value={`${current.shaft_width}×${current.shaft_depth} mm`} />
            <InfoRow label="Tracción"  value={autoTractionLabel(current.model, String(current.speed))} />
            <InfoRow label="Rieles"    value={`${autoRails(current.model).cabin} / ${autoRails(current.model).counterweight}`} />
            <InfoRow label="Normativa" value={current.norm} />
          </Card>

          <Card title="Cabina" icon={Settings2}>
            <InfoRow label="Modelo"   value={current.cabin_model} />
            <InfoRow label="Acabado"  value={current.cabin_finish} />
            <InfoRow label="Piso"     value={current.cabin_floor} />
            <InfoRow label="Plafón"   value={current.cop_model} />
            <InfoRow label="Puerta"   value={current.door_type} />
            <InfoRow label="Paso"     value={`${current.door_width}×${current.door_height} mm`} />
            <InfoRow label="Piso nomen." value={generateFloorNomenclature(current.stops)} />
          </Card>

          {current.internal_notes && (
            <Card title="Notas internas">
              <p className="text-xs text-[#0A2463]/70 leading-relaxed">{current.internal_notes}</p>
            </Card>
          )}
        </div>

        {/* Historial */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <h2 className="text-base font-black text-[#0A2463] mb-5 flex items-center gap-2"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              <Clock size={16} className="text-[#D4AF37]" />
              Historial de seguimiento
            </h2>

            {loadingH ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl luxury-glass flex items-center justify-center">
                  <MessageSquare size={22} className="text-[#0A2463]/25" />
                </div>
                <p className="text-sm font-medium text-[#0A2463]/40">Sin cambios registrados aún</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[#0A2463]/10" />
                <div className="space-y-4">
                  {history.map((h, i) => {
                    const sc = STATUS_CFG[h.to_status as QuoteStatus] ?? STATUS_CFG['Borrador'];
                    return (
                      <div key={h.id} className="flex gap-4 pl-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border ${sc.cls}`}>
                          <sc.icon size={14} />
                        </div>
                        <div className="flex-1 luxury-glass rounded-2xl p-4 border border-[#0A2463]/6">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${sc.cls}`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                                {sc.label}
                              </span>
                              {h.from_status && (
                                <span className="text-[10px] text-[#0A2463]/40 ml-2">← {h.from_status}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#0A2463]/35 shrink-0">
                              {new Date(h.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="text-[11px] font-semibold text-[#D4AF37] mb-1">{h.user_name}</p>
                          {h.note && (
                            <p className="text-xs text-[#0A2463]/60 leading-relaxed bg-white/60 rounded-xl px-3 py-2 mt-2">
                              {h.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Acción rápida: enviar por correo */}
            {current.client_email && (
              <div className="mt-6 luxury-glass rounded-2xl p-4 border border-[#D4AF37]/15 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0A2463]">Enviar propuesta por correo</p>
                  <p className="text-[11px] text-[#0A2463]/50">{current.client_email}</p>
                </div>
                <a href={`mailto:${current.client_email}?subject=Propuesta%20${current.folio}%20%E2%80%94%20Elevadores%20Alamex&body=Estimado%2Fa%20${encodeURIComponent(current.client_name)}%2C%0A%0AAdjunto%20la%20propuesta%20${current.folio}.%0A%0AQuedamos%20a%20sus%20%C3%B3rdenes.%0A${encodeURIComponent(sellerName)}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white transition-all"
                  style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
                  <Mail size={13} /> Enviar
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
