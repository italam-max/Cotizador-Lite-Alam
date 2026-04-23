// ARCHIVO: src/features/pipeline/Pipeline.tsx
// Vista de lista — ordenada por más reciente primero, filtros por estatus
import { useState, useEffect } from 'react';
import { Loader2, Activity, ChevronRight, TrendingUp, FileText } from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import type { Quote, QuoteStatus } from '../../types';

interface Props { onOpenDetail: (q: Quote) => void }

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  'Borrador':       { dot: '#94a3b8', bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Borrador'       },
  'En progreso':    { dot: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'En progreso'    },
  'En Negociación': { dot: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Negociación'    },
  'Ganada':         { dot: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700',label: 'Ganada'         },
  'Perdida':        { dot: '#ef4444', bg: 'bg-red-50',     text: 'text-red-500',    label: 'Perdida'        },
  'Cancelada':      { dot: '#6b7280', bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Cancelada'      },
};

const MODEL_COLOR: Record<string, string> = {
  'MR': '#1B3A6B', 'MRL-L': '#2563eb', 'MRL-G': '#7c3aed', 'HYD': '#0891b2', 'Home Lift': '#059669',
};

const FILTER_ORDER: (QuoteStatus | null)[] = [
  null, 'En progreso', 'En Negociación', 'Borrador', 'Ganada', 'Perdida',
];

const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const fmtCmp = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });

function quoteTotal(q: Quote): number {
  const isPricePerSystem = q.system_type && q.system_type !== 'Simplex';
  return isPricePerSystem ? (q.price || 0) : (q.price || 0) * q.quantity;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function Pipeline({ onOpenDetail }: Props) {
  const [quotes,  setQuotes]  = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<QuoteStatus | null>(null);

  useEffect(() => {
    QuotesService.getAll().then(setQuotes).finally(() => setLoading(false));
  }, []);

  // Más recientes primero
  const sorted   = [...quotes].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const filtered = filter ? sorted.filter(q => q.status === filter) : sorted;

  const pipelineValue = quotes
    .filter(q => ['En progreso', 'En Negociación'].includes(q.status))
    .reduce((s, q) => s + quoteTotal(q), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* ── Header ── */}
      <div className="relative z-10 px-4 sm:px-6 py-4 shrink-0 bg-white/60 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Título + métricas */}
          <div className="flex-1">
            <h1 className="text-lg font-black text-[#0A2463] flex items-center gap-2"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              <Activity size={18} className="text-[#D4AF37]" />
              Seguimiento
            </h1>
            <div className="flex items-center gap-4 mt-0.5">
              <span className="text-xs text-[#0A2463]/50 font-medium">
                {quotes.length} cotizaciones
              </span>
              {pipelineValue > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#0A2463]/70">
                  <TrendingUp size={11} className="text-[#D4AF37]" />
                  Pipeline: {fmtCmp.format(pipelineValue)}
                </span>
              )}
            </div>
          </div>

          {/* Mini-KPIs por estatus */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['En progreso','En Negociación','Ganada','Perdida'] as QuoteStatus[]).map(s => {
              const count = quotes.filter(q => q.status === s).length;
              if (!count) return null;
              const cfg = STATUS_CFG[s];
              return (
                <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label} {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_ORDER.map(s => {
            const isAll    = s === null;
            const cfg      = s ? STATUS_CFG[s] : null;
            const count    = s ? quotes.filter(q => q.status === s).length : quotes.length;
            const isActive = filter === s;
            return (
              <button
                key={String(s)}
                onClick={() => setFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0 border ${
                  isActive
                    ? 'bg-[#0A2463] text-white border-[#0A2463]'
                    : 'bg-white/70 text-[#0A2463]/60 border-[#0A2463]/10 hover:border-[#D4AF37]/40 hover:text-[#0A2463]'
                }`}>
                {cfg && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                )}
                {isAll ? 'Todas' : cfg?.label ?? s}
                <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-white/20' : 'bg-[#0A2463]/8'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <Loader2 size={28} className="animate-spin text-[#D4AF37]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-3">
          <FileText size={32} className="text-[#0A2463]/20" />
          <p className="text-sm text-[#0A2463]/40 font-medium">
            {filter ? `Sin cotizaciones con estatus "${filter}"` : 'Sin cotizaciones aún'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto relative z-10">
          {/* Cabecera tabla — desktop only */}
          <div className="hidden sm:grid sm:grid-cols-[140px_1fr_160px_120px_100px_36px] gap-3 items-center px-4 sm:px-6 py-2 border-b border-[#0A2463]/6 bg-white/30">
            <span className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-wider">Folio / Fecha</span>
            <span className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-wider">Cliente · Equipo</span>
            <span className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-wider">Estatus</span>
            <span className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-wider text-right">Precio</span>
            <span className="text-[10px] font-black text-[#0A2463]/40 uppercase tracking-wider">Sistema</span>
            <span />
          </div>

          <div className="divide-y divide-[#0A2463]/5">
            {filtered.map((q, idx) => {
              const cfg   = STATUS_CFG[q.status] || STATUS_CFG['Borrador'];
              const total = quoteTotal(q);
              return (
                <button
                  key={q.id}
                  onClick={() => onOpenDetail(q)}
                  className={`w-full text-left transition-all hover:bg-white/70 active:bg-[#D4AF37]/5 group ${
                    idx % 2 === 0 ? 'bg-white/30' : 'bg-white/10'
                  }`}>

                  {/* ── Mobile card ── */}
                  <div className="sm:hidden px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-[#0A2463]/40 font-mono">{formatDate(q.created_at)}</span>
                        </div>
                        <p className="text-sm font-black text-[#0A2463] truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {q.client_name}
                        </p>
                        <p className="text-[11px] text-[#0A2463]/50 mt-0.5 font-medium">
                          {q.folio} · {q.model} · {q.capacity}kg · {q.stops} par.
                          {q.system_type && q.system_type !== 'Simplex' ? ` · ${q.system_type}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {total > 0 && (
                          <p className="text-sm font-black text-[#0A2463]" style={{ fontFamily: "'Syne', sans-serif" }}>
                            {fmtCmp.format(total)}
                          </p>
                        )}
                        <ChevronRight size={14} className="text-[#0A2463]/25 group-hover:text-[#D4AF37] transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* ── Desktop row ── */}
                  <div className="hidden sm:grid sm:grid-cols-[140px_1fr_160px_120px_100px_36px] gap-3 items-center px-4 sm:px-6 py-3">

                    {/* Folio + fecha */}
                    <div>
                      <p className="text-xs font-black text-[#0A2463] font-mono group-hover:text-[#D4AF37] transition-colors">
                        {q.folio}
                      </p>
                      <p className="text-[10px] text-[#0A2463]/40 mt-0.5">{formatDate(q.created_at)}</p>
                    </div>

                    {/* Cliente + equipo */}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0A2463] truncate">{q.client_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: MODEL_COLOR[q.model] || '#1B3A6B' }}>
                          {q.model}
                        </span>
                        <span className="text-[10px] text-[#0A2463]/50 truncate">
                          {q.use_type} · {q.capacity}kg · {q.stops} par. · {q.quantity} eq.
                        </span>
                      </div>
                    </div>

                    {/* Estatus */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                        {q.status}
                      </span>
                    </div>

                    {/* Precio */}
                    <div className="text-right">
                      {total > 0 ? (
                        <>
                          <p className="text-sm font-black text-[#0A2463]" style={{ fontFamily: "'Syne', sans-serif" }}>
                            {fmtCmp.format(total)}
                          </p>
                          <p className="text-[9px] text-[#0A2463]/35 mt-0.5">{q.currency || 'MXN'} + IVA</p>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#0A2463]/25">—</span>
                      )}
                    </div>

                    {/* Sistema */}
                    <div>
                      {q.system_type && q.system_type !== 'Simplex' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0A2463]/8 text-[#0A2463]/60">
                          {q.system_type}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#0A2463]/25">Simplex</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ChevronRight size={15}
                        className="text-[#0A2463]/20 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pie de lista */}
          {filtered.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-[#0A2463]/6 bg-white/20">
              <p className="text-[10px] text-[#0A2463]/35 font-medium">
                {filtered.length} cotización{filtered.length > 1 ? 'es' : ''} · Ordenadas por fecha (más reciente primero)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
