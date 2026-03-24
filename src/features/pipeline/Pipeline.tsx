// ARCHIVO: src/features/pipeline/Pipeline.tsx
import { useState, useEffect } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { QuotesService } from '../../services/quotesService';
import type { Quote, QuoteStatus } from '../../types';

interface Props { onOpenDetail: (q: Quote) => void }

const COLS: { status: QuoteStatus; label: string; color: string }[] = [
  { status: 'Borrador',       label: 'Borrador',       color: '#64748b' },
  { status: 'Enviada',        label: 'Enviada',        color: '#3b82f6' },
  { status: 'En Negociación', label: 'En Negociación', color: '#eab308' },
  { status: 'Ganada',         label: 'Ganada',         color: '#22c55e' },
  { status: 'Perdida',        label: 'Perdida',        color: '#ef4444' },
];

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export default function Pipeline({ onOpenDetail }: Props) {
  const [quotes,  setQuotes]  = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    QuotesService.getAll().then(setQuotes).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--gold-500)' }} />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 py-6 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Seguimiento</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Vista de pipeline por estado</p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full p-6" style={{ minWidth: `${COLS.length * 280}px` }}>
          {COLS.map(col => {
            const items = quotes.filter(q => q.status === col.status);
            const total = items.reduce((s, q) => s + (q.price||0)*q.quantity, 0);
            return (
              <div key={col.status} className="w-64 shrink-0 flex flex-col rounded-2xl overflow-hidden"
                style={{ background: 'rgba(15,32,64,0.4)', border: '1px solid var(--border)' }}>

                {/* Column header */}
                <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{col.label}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{items.length}</span>
                </div>

                {total > 0 && (
                  <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold" style={{ color: col.color }}>{fmt.format(total)}</p>
                  </div>
                )}

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin cotizaciones</p>
                    </div>
                  ) : items.map(q => (
                    <div key={q.id}
                      className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] group"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                      onClick={() => onOpenDetail(q)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight flex-1" style={{ color: 'var(--text-primary)' }}>
                          {q.client_name}
                        </p>
                        <ChevronRight size={12} className="shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                          style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {q.folio} · {q.model} · {q.stops} par.
                      </p>
                      {q.price > 0 && (
                        <p className="text-xs font-semibold mt-2" style={{ color: col.color }}>
                          {fmt.format(q.price * q.quantity)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
