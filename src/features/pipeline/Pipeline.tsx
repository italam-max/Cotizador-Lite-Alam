// ARCHIVO: src/features/pipeline/Pipeline.tsx
// Diseño consistente con el dashboard original — mismo estilo visual
import { useState, useEffect } from 'react';
import { Loader2, ChevronRight, Activity, Sparkles } from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import type { Quote, QuoteStatus } from '../../types';

interface Props { onOpenDetail: (q: Quote) => void }

const COLS: { status: QuoteStatus; label: string; dot: string; badge: string }[] = [
  { status: 'Borrador',       label: 'Borrador',       dot: '#94a3b8', badge: 'bg-slate-100 text-slate-600'      },
  { status: 'Enviada',        label: 'Enviada',        dot: '#3b82f6', badge: 'bg-blue-50 text-blue-700'         },
  { status: 'En Negociación', label: 'En Negociación', dot: '#f59e0b', badge: 'bg-amber-50 text-amber-700'       },
  { status: 'Ganada',         label: 'Ganada',         dot: '#10b981', badge: 'bg-emerald-50 text-emerald-700'   },
  { status: 'Perdida',        label: 'Perdida',        dot: '#ef4444', badge: 'bg-red-50 text-red-600'           },
];

const MODEL_COLOR: Record<string, string> = {
  'MR': '#1B3A6B', 'MRL-L': '#2563eb', 'MRL-G': '#7c3aed', 'HYD': '#0891b2', 'Home Lift': '#059669',
};

const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const fmtCmp = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });

export default function Pipeline({ onOpenDetail }: Props) {
  const [quotes,  setQuotes]  = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    QuotesService.getAll().then(setQuotes).finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 shrink-0 flex items-center bg-white/60 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm">
        <h1 className="text-xl font-black text-[#0A2463] flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          <Activity size={18} className="text-[#D4AF37]" />
          Seguimiento de Pipeline
        </h1>
        <div className="ml-6 flex items-center gap-4">
          <span className="text-xs text-[#0A2463]/50 font-medium">{quotes.length} cotizaciones</span>
          <span className="text-xs font-bold text-[#0A2463]/70">
            Pipeline activo: {fmtCmp.format(
              quotes.filter(q => ['Enviada','En Negociación'].includes(q.status))
                    .reduce((s,q) => s+(q.price||0)*q.quantity, 0)
            )}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <Loader2 size={28} className="animate-spin text-[#D4AF37]" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative z-10">
          <div className="flex gap-4 h-full p-5" style={{ minWidth: `${COLS.length * 285}px` }}>
            {COLS.map(col => {
              const items = quotes.filter(q => q.status === col.status);
              const total = items.reduce((s, q) => s + (q.price||0)*q.quantity, 0);

              return (
                <div key={col.status} className="w-[272px] shrink-0 flex flex-col rounded-2xl overflow-hidden luxury-glass border border-[#D4AF37]/10 shadow-sm">

                  {/* Column header */}
                  <div className="px-4 py-3 shrink-0 border-b border-[#0A2463]/8 bg-white/40">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.dot }} />
                        <span className="text-xs font-black text-[#0A2463] uppercase tracking-wider" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {col.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-black bg-[#0A2463]/8 text-[#0A2463] px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    {total > 0 && (
                      <p className="text-xs font-bold pl-4" style={{ color: col.dot }}>
                        {fmtCmp.format(total)}
                      </p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-xs text-[#0A2463]/30 font-medium">Sin cotizaciones</p>
                      </div>
                    ) : (
                      items.map(q => (
                        <button key={q.id} onClick={() => onOpenDetail(q)}
                          className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#0A2463]/5 border border-[#0A2463]/6 hover:border-[#D4AF37]/30 transition-all group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white shrink-0"
                                style={{ backgroundColor: MODEL_COLOR[q.model] || '#1B3A6B', fontFamily: "'Syne', sans-serif" }}>
                                {q.model}
                              </span>
                              <p className="text-xs font-bold text-[#0A2463] truncate group-hover:text-[#D4AF37] transition-colors">
                                {q.client_name}
                              </p>
                            </div>
                            <ChevronRight size={12} className="shrink-0 text-[#0A2463]/30 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all mt-0.5" />
                          </div>
                          <p className="text-[10px] text-[#0A2463]/50 mt-1 pl-0.5 font-medium">
                            {q.folio} · {q.stops} par. · {q.capacity} kg
                          </p>
                          {(q.price || 0) > 0 && (
                            <p className="text-xs font-black text-[#0A2463] mt-1.5 pl-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>
                              {fmt.format((q.price||0) * q.quantity)}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
