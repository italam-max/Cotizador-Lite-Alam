// ARCHIVO: src/features/quoter/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, FileText, Award, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import type { Quote, QuoteStatus } from '../../types';

interface Props {
  onNewQuote:   () => void;
  onEditQuote:  (q: Quote) => void;
  onOpenDetail: (q: Quote) => void;
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  'Borrador':        'status-borrador',
  'Enviada':         'status-enviada',
  'En Negociación':  'status-negociacion',
  'Ganada':          'status-ganada',
  'Perdida':         'status-perdida',
  'Cancelada':       'status-cancelada',
};

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export default function Dashboard({ onNewQuote, onEditQuote, onOpenDetail }: Props) {
  const [quotes,  setQuotes]  = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<QuoteStatus | 'Todas'>('Todas');

  useEffect(() => {
    QuotesService.getAll()
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      q.folio.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todas' || q.status === filter;
    return matchSearch && matchFilter;
  });

  // Stats
  const stats = {
    total:     quotes.length,
    ganadas:   quotes.filter(q => q.status === 'Ganada').length,
    negocio:   quotes.filter(q => q.status === 'En Negociación').length,
    monto:     quotes.filter(q => q.status === 'Ganada').reduce((s, q) => s + (q.price || 0) * q.quantity, 0),
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-8 py-6 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Cotizaciones</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} en total
            </p>
          </div>
          <button onClick={onNewQuote} className="btn-primary">
            <Plus size={16} /> Nueva cotización
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: FileText,    label: 'Total',         value: stats.total,   color: '#93c5fd' },
            { icon: Clock,       label: 'En Negociación',value: stats.negocio, color: '#fde047' },
            { icon: Award,       label: 'Ganadas',       value: stats.ganadas, color: '#86efac' },
            { icon: TrendingUp,  label: 'Monto Ganado',  value: fmt.format(stats.monto), color: 'var(--gold-400)' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={15} style={{ color: s.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <p className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente o folio..."
            className="input-base pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['Todas','Borrador','Enviada','En Negociación','Ganada','Perdida'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s ? 'btn-primary !py-1.5 !px-3' : 'btn-ghost !py-1.5 !px-3'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold-500)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <FileText size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'Sin resultados para tu búsqueda' : 'No hay cotizaciones aún'}
            </p>
            {!search && <button onClick={onNewQuote} className="btn-primary !py-2 !px-4 !text-xs">Crear primera cotización</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => (
              <div key={q.id}
                className="glass rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer group transition-all hover:scale-[1.005]"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                onClick={() => q.status === 'Borrador' ? onEditQuote(q) : onOpenDetail(q)}>

                {/* Folio */}
                <div className="shrink-0 w-32">
                  <p className="font-display font-semibold text-sm" style={{ color: 'var(--gold-400)' }}>{q.folio}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{q.project_date}</p>
                </div>

                {/* Cliente */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{q.client_name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {q.model} · {q.capacity} kg · {q.stops} paradas · {q.use_type}
                  </p>
                </div>

                {/* Precio */}
                <div className="shrink-0 text-right mr-4">
                  {q.price > 0 ? (
                    <>
                      <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {fmt.format(q.price * q.quantity)}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {q.quantity > 1 ? `${q.quantity} equipos` : '1 equipo'}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin precio</p>
                  )}
                </div>

                {/* Status */}
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium ${STATUS_STYLE[q.status]}`}>
                  {q.status}
                </span>

                <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
