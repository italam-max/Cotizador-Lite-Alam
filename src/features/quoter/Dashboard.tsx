// ARCHIVO: src/features/quoter/Dashboard.tsx
// Estilo 1:1 del original — luxury-glass, arabesque bg, colores originales,
// sub-componentes MetricCard y StatusBadge
import { useState, useEffect } from 'react';
import {
  Search, Clock, CheckCircle2, XCircle, FileText,
  Sparkles, DollarSign, Activity, Calendar, User,
  ChevronRight, TrendingUp, Plus, Loader2
} from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import type { Quote, QuoteStatus } from '../../types';

interface Props {
  onNewQuote:   () => void;
  onEditQuote:  (q: Quote) => void;
  onOpenDetail: (q: Quote) => void;
}

// Colores de modelo — del original
const getModelColor = (model: string) => {
  const map: Record<string, string> = {
    'MR':        'text-[#0A2463] border-[#0A2463]/30',
    'MRL-L':     'text-blue-700 border-blue-200',
    'MRL-G':     'text-violet-700 border-violet-200',
    'HYD':       'text-cyan-700 border-cyan-200',
    'Home Lift': 'text-emerald-700 border-emerald-200',
  };
  return map[model] ?? 'text-[#0A2463] border-[#0A2463]/30';
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  'Borrador':       'BORRADOR',
  'En progreso':    'EN PROGRESO',
  'En Negociación': 'NEGOCIACIÓN',
  'Ganada':         'GANADA',
  'Perdida':        'PERDIDA',
  'Cancelada':      'CANCELADA',
};

const STATUS_CSS: Record<QuoteStatus, string> = {
  'Borrador':       'bg-gray-100 text-gray-500',
  'En progreso':    'bg-blue-50 text-blue-700',
  'En Negociación': 'bg-amber-50 text-amber-700',
  'Ganada':         'bg-emerald-50 text-emerald-700',
  'Perdida':        'bg-red-50 text-red-600',
  'Cancelada':      'bg-gray-100 text-gray-400',
};

export default function Dashboard({ onNewQuote, onEditQuote, onOpenDetail }: Props) {
  const [quotes,  setQuotes]  = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('Todos');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    QuotesService.getAll().then(setQuotes).finally(() => setLoading(false));
  }, []);

  const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const fmtCmp = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });

  const abiertas   = quotes.filter(q => ['Borrador','En progreso','En Negociación'].includes(q.status));
  const ganadas    = quotes.filter(q => q.status === 'Ganada');
  const pipeline   = abiertas.reduce((s, q) => s + (q.price||0)*q.quantity, 0);
  const ventas     = ganadas.reduce((s,  q) => s + (q.price||0)*q.quantity, 0);

  const recientes = [...quotes].sort((a,b) =>
    new Date(b.updated_at||b.project_date).getTime() - new Date(a.updated_at||a.project_date).getTime()
  ).slice(0,5);

  const filtered = quotes.filter(q => {
    const ms = !search ||
      q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      q.folio.toLowerCase().includes(search.toLowerCase());
    if (filter === 'Abiertas') return ms && ['Borrador','En progreso','En Negociación'].includes(q.status);
    if (filter === 'Ganadas')  return ms && q.status === 'Ganada';
    if (filter === 'Perdidas') return ms && q.status === 'Perdida';
    return ms;
  }).sort((a,b) => new Date(b.updated_at||b.project_date).getTime() - new Date(a.updated_at||a.project_date).getTime());

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* Header de sección — estilo original */}
      <div className="px-6 py-5 flex items-center bg-white/60 backdrop-blur-md sticky top-0 z-20 border-b border-[#D4AF37]/20 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-[#0A2463] tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          <Sparkles className="text-[#D4AF37]" size={18} />
          Panel de Control
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-[1800px] mx-auto space-y-6">

          {/* KPIs + Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* KPIs */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Abiertas"   value={abiertas.length.toString()}     sub="Proyectos activos" icon={Clock}         color="text-[#0A2463]"  bgIcon="bg-[#0A2463]/10" />
              <MetricCard label="Pipeline"   value={fmtCmp.format(pipeline)}         sub="Valor potencial"   icon={Activity}      color="text-blue-600"   bgIcon="bg-blue-50" />
              <MetricCard label="Cerradas"   value={ganadas.length.toString()}       sub="Éxitos totales"    icon={CheckCircle2}  color="text-green-600"  bgIcon="bg-green-50" />
              <MetricCard label="Ventas"     value={fmtCmp.format(ventas)}           sub="Monto acumulado"   icon={DollarSign}    color="text-[#D4AF37]"  bgIcon="bg-yellow-50" />
            </div>

            {/* Recientes */}
            <div className="lg:col-span-4 luxury-glass rounded-xl p-4 flex flex-col shadow-sm border border-[#D4AF37]/20">
              <h3 className="font-bold text-[#0A2463] text-sm mb-3 flex items-center gap-2 border-b border-[#0A2463]/10 pb-2">
                <TrendingUp size={14} className="text-[#D4AF37]" /> Recientes
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[140px]">
                {recientes.length === 0
                  ? <p className="text-center text-xs text-gray-400 py-4">Sin actividad reciente</p>
                  : recientes.map(q => (
                    <div key={q.id} onClick={() => q.status === 'Borrador' ? onEditQuote(q) : onOpenDetail(q)}
                      className="flex items-center justify-between p-2 hover:bg-white/60 rounded-lg cursor-pointer group transition-all">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="w-1 h-8 bg-[#D4AF37]/50 rounded-full shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-[#0A2463] text-xs truncate group-hover:text-[#D4AF37] transition-colors">{q.folio}</p>
                          <p className="text-[10px] text-gray-500 truncate">{q.client_name}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-[#0A2463]/70 shrink-0 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100 ml-2">
                        {fmtCmp.format((q.price||0)*q.quantity)}
                      </p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Lista principal */}
          <div className="luxury-glass rounded-xl overflow-hidden flex flex-col shadow-sm border border-[#D4AF37]/20 min-h-[400px]">

            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-[#D4AF37]/10 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/40">
              <div className="flex bg-[#0A2463]/5 rounded-lg p-1 self-start sm:self-auto">
                {['Todos','Abiertas','Ganadas','Perdidas'].map(tab => (
                  <button key={tab} onClick={() => setFilter(tab)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      filter === tab
                        ? 'bg-white text-[#0A2463] shadow-sm ring-1 ring-black/5'
                        : 'text-[#0A2463]/60 hover:text-[#0A2463]'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A2463]/40 group-focus-within:text-[#D4AF37] transition-colors" size={14} />
                <input type="text" placeholder="Buscar cliente, folio..."
                  className="w-full pl-9 pr-3 py-2 bg-white/60 border border-[#0A2463]/10 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#D4AF37]/50 outline-none text-[#0A2463] transition-all"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Filas */}
            <div className="overflow-y-auto bg-white/30 flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-[#D4AF37]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-16 text-center text-[#0A2463]/40 text-sm flex flex-col items-center">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">No hay cotizaciones para mostrar</p>
                  {!search && (
                    <button onClick={onNewQuote}
                      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: '#0A2463' }}>
                      <Plus size={13} /> Crear primera cotización
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#D4AF37]/5">
                  {filtered.map(q => (
                    <div key={q.id}
                      onClick={() => q.status === 'Borrador' ? onEditQuote(q) : onOpenDetail(q)}
                      className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-white transition-all cursor-pointer border-l-[3px] border-transparent hover:border-[#D4AF37] hover:shadow-md">

                      {/* Izquierda: modelo + ref + cliente */}
                      <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-xs border bg-white ${getModelColor(q.model)}`}
                          style={{ fontFamily: "'Syne', sans-serif" }}>
                          {q.model.substring(0,2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-black text-[#0A2463] group-hover:text-[#D4AF37] transition-colors truncate"
                              style={{ fontFamily: "'Syne', sans-serif" }}>
                              {q.folio}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_CSS[q.status]}`}>
                              {STATUS_LABELS[q.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1 font-medium truncate">
                              <User size={10} /> {q.client_name}
                            </span>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 opacity-70">
                              <Calendar size={10} /> {q.project_date}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Derecha: specs + precio + flecha */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-3 sm:mt-0 pl-14 sm:pl-0">
                        <div className="hidden md:flex flex-col items-end text-right mr-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Configuración</span>
                          <span className="text-xs text-gray-600 font-medium">
                            {q.stops} Paradas • {q.capacity} kg
                          </span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#D4AF37] transition-colors">Total</p>
                          <p className="text-sm font-black text-[#0A2463] font-mono">
                            {fmt.format((q.price||0)*q.quantity)}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-[#0A2463] group-hover:text-[#D4AF37] transition-all transform group-hover:translate-x-1">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color, bgIcon }: {
  label: string; value: string; sub: string;
  icon: any; color: string; bgIcon: string;
}) {
  return (
    <div className="luxury-glass rounded-xl p-5 flex items-start gap-4 shadow-sm border border-[#D4AF37]/10 hover:shadow-md transition-shadow">
      <div className={`${bgIcon} p-3 rounded-xl shrink-0`}>
        <Icon className={color} size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        <p className="font-black text-2xl text-[#0A2463] leading-none"
          style={{ fontFamily: "'Syne', sans-serif" }}>{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}
