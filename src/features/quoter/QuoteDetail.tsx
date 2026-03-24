// ARCHIVO: src/features/quoter/QuoteDetail.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, ChevronDown, Loader2, CheckCircle2, Clock,
  Send, TrendingUp, Award, XCircle, Ban, MessageSquare, Download, FileText } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { QuotesService } from '../../services/quotesService';
import { QuotePDFDocument } from '../pdf/QuotePDF';
import type { Quote, QuoteHistory, QuoteStatus, UserRecord } from '../../types';

interface Props {
  quote:           Quote;
  user:            UserRecord;
  onBack:          () => void;
  onEdit:          () => void;
  onStatusChanged: () => void;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; cls: string; Icon: any }> = {
  'Borrador':       { label: 'Borrador',       cls: 'status-borrador',    Icon: FileText    },
  'Enviada':        { label: 'Enviada',         cls: 'status-enviada',     Icon: Send        },
  'En Negociación': { label: 'En Negociación',  cls: 'status-negociacion', Icon: TrendingUp  },
  'Ganada':         { label: 'Ganada ✓',        cls: 'status-ganada',      Icon: Award       },
  'Perdida':        { label: 'Perdida',         cls: 'status-perdida',     Icon: XCircle     },
  'Cancelada':      { label: 'Cancelada',       cls: 'status-cancelada',   Icon: Ban         },
};

const PIPELINE: QuoteStatus[] = ['Borrador','Enviada','En Negociación','Ganada','Perdida','Cancelada'];
const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export default function QuoteDetail({ quote, user, onBack, onEdit, onStatusChanged }: Props) {
  const [current, setCurrent]     = useState<Quote>(quote);
  const [history, setHistory]     = useState<QuoteHistory[]>([]);
  const [loadingH, setLoadingH]   = useState(true);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [pending, setPending]     = useState<QuoteStatus | null>(null);
  const [note, setNote]           = useState('');
  const [changing, setChanging]   = useState(false);

  useEffect(() => {
    QuotesService.getHistory(current.id)
      .then(setHistory)
      .finally(() => setLoadingH(false));
  }, [current.id]);

  const cfg = STATUS_CONFIG[current.status] ?? STATUS_CONFIG['Borrador'];

  const startChange = (s: QuoteStatus) => {
    if (s === current.status) { setMenuOpen(false); return; }
    setPending(s); setMenuOpen(false);
  };

  const confirmChange = async () => {
    if (!pending) return;
    setChanging(true);
    try {
      const updated = await QuotesService.changeStatus(current.id, pending, note);
      setCurrent(updated);
      const h = await QuotesService.getHistory(current.id);
      setHistory(h);
      onStatusChanged();
    } catch (e: any) { alert('Error: ' + e?.message); }
    finally { setChanging(false); setPending(null); setNote(''); }
  };

  const total = (current.price || 0) * (current.quantity || 1);
  const isMRL = current.model.includes('MRL');
  const pdfName = `${current.folio}_${current.client_name}.pdf`.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-.]/g,'');

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="px-8 py-5 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost !px-3 !py-2"><ArrowLeft size={16}/></button>
          <div>
            <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{current.folio}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{current.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* PDF Download */}
          <PDFDownloadLink
            document={<QuotePDFDocument quote={current} seller={user.name} sellerTitle={user.job_title} />}
            fileName={pdfName}>
            {({ loading }) => (
              <button disabled={loading} className="btn-ghost">
                {loading ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
                {loading ? 'Generando...' : 'Descargar PDF'}
              </button>
            )}
          </PDFDownloadLink>

          {/* Cambiar estado */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${cfg.cls}`}>
              <cfg.Icon size={13}/>{cfg.label}
              <ChevronDown size={12} style={{ transform: menuOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}/>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-2xl p-2 z-50 min-w-[200px] animate-scale-in"
                style={{ background: 'var(--navy-800)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                {PIPELINE.map(s => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => startChange(s)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium mb-1 transition-all ${s === current.status ? c.cls : ''}`}
                      style={{ color: s === current.status ? undefined : 'var(--text-secondary)' }}
                      onMouseEnter={e => { if (s !== current.status) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (s !== current.status) (e.currentTarget as HTMLElement).style.background = ''; }}>
                      <c.Icon size={13}/>{c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={onEdit} className="btn-ghost"><Edit3 size={15}/>Editar</button>
        </div>
      </div>

      {/* Modal cambio de estado */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-3xl p-8 max-w-md w-full mx-4 animate-scale-in"
            style={{ background: 'var(--navy-800)', border: '1px solid var(--border)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
            <h3 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              Cambiar estado
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {current.status} → <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[pending]?.cls}`}>{STATUS_CONFIG[pending]?.label}</span>
            </p>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Nota opcional (acuerdos, motivos, próximo paso...)"
              className="input-base resize-none mb-5" />
            <div className="flex gap-3">
              <button onClick={() => { setPending(null); setNote(''); }} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={confirmChange} disabled={changing} className="btn-primary flex-1 justify-center">
                {changing ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">

        {/* Columna izquierda — resumen */}
        <div className="w-[300px] shrink-0 border-r overflow-y-auto p-5 space-y-4"
          style={{ borderColor: 'var(--border)', background: 'rgba(10,22,40,0.4)' }}>

          <Card title="Cliente">
            <InfoRow label="Nombre" value={current.client_name} />
            <InfoRow label="Email"  value={current.client_email} />
            <InfoRow label="Tel."   value={current.client_phone} />
            <InfoRow label="Fecha"  value={current.project_date} />
          </Card>

          <Card title="Equipo">
            <InfoRow label="Modelo"    value={current.model} />
            <InfoRow label="Uso"       value={current.use_type} />
            <InfoRow label="Capacidad" value={`${current.capacity} kg`} />
            <InfoRow label="Personas"  value={current.persons} />
            <InfoRow label="Velocidad" value={`${current.speed} m/s`} />
            <InfoRow label="Paradas"   value={current.stops} />
            <InfoRow label="Cantidad"  value={`${current.quantity} equipo(s)`} />
            {!isMRL && <InfoRow label="Fosa"  value={`${current.pit} mm`} />}
            {!isMRL && <InfoRow label="Huida" value={`${current.overhead} mm`} />}
            <InfoRow label="Normativa" value={current.norm} />
          </Card>

          {current.price > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold-500)' }}>Inversión total</p>
              <p className="font-display font-bold text-2xl" style={{ color: 'var(--gold-400)' }}>{fmt.format(total)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Con IVA: {fmt.format(total*1.16)}</p>
            </div>
          )}

          {current.internal_notes && (
            <Card title="Notas internas">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{current.internal_notes}</p>
            </Card>
          )}
        </div>

        {/* Columna derecha — historial */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            <h2 className="font-display font-semibold text-base mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Clock size={16} style={{ color: 'var(--gold-500)' }} />
              Historial de seguimiento
            </h2>

            {loadingH ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold-500)' }} /></div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <MessageSquare size={32} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sin cambios registrados aún</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                <div className="space-y-4">
                  {history.map((h, i) => {
                    const cfg2 = STATUS_CONFIG[h.to_status as QuoteStatus] ?? STATUS_CONFIG['Borrador'];
                    return (
                      <div key={h.id} className="flex gap-4 pl-2 animate-slide-up" style={{ animationDelay: `${i*0.05}s` }}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg2.cls}`}>
                          <cfg2.Icon size={14} />
                        </div>
                        <div className="flex-1 pb-4" style={{ borderBottom: i < history.length-1 ? '1px solid var(--border)' : 'none' }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-xs font-semibold ${cfg2.cls.replace('status-','text-')}`}>{cfg2.label}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {new Date(h.created).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                            </p>
                          </div>
                          {h.from_status && (
                            <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Antes: {h.from_status}</p>
                          )}
                          <p className="text-xs" style={{ color: 'var(--gold-500)' }}>{h.user_name}</p>
                          {h.note && (
                            <div className="mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              {h.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 glass">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold-500)' }}>{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
    </div>
  );
}
