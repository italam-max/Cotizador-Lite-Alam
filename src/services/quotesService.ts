// ARCHIVO: src/services/quotesService.ts
import { pbCol, authStore } from './pb';
import type { Quote, QuoteHistory, QuoteStatus } from '../types';

const quotes  = pbCol<Quote>('quotes');
const history = pbCol<QuoteHistory>('quote_history');

// ─── FOLIO AUTOMÁTICO ───────────────────────────────────────
export async function nextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const res = await quotes.list({
      filter: `folio ~ "ALAM-${year}"`,
      sort:   '-folio',
      perPage: 1,
    });
    if (res.totalItems === 0) return `ALAM-${year}-001`;
    const last = res.items[0].folio;
    const num  = parseInt(last.split('-')[2] ?? '0') + 1;
    return `ALAM-${year}-${String(num).padStart(3, '0')}`;
  } catch {
    return `ALAM-${year}-${Date.now().toString().slice(-4)}`;
  }
}

// ─── CRUD ────────────────────────────────────────────────────
export const QuotesService = {
  async getAll(): Promise<Quote[]> {
    const res = await quotes.list({ sort: '-created', perPage: 200 });
    return res.items;
  },

  async getOne(id: string): Promise<Quote> {
    return quotes.getOne(id);
  },

  async create(data: Omit<Quote, 'id'|'created'|'updated'|'collectionId'|'collectionName'>): Promise<Quote> {
    const q = await quotes.create({ ...data, owner_id: authStore.model?.id ?? '' });
    // Registrar en historial
    await history.create({
      quote_id:  q.id,
      user_name: authStore.model?.name ?? 'Sistema',
      from_status: '',
      to_status:   q.status,
      note:        'Cotización creada',
    } as any);
    return q;
  },

  async update(id: string, data: Partial<Quote>): Promise<Quote> {
    return quotes.update(id, data as any);
  },

  async delete(id: string): Promise<void> {
    return quotes.delete(id);
  },

  async changeStatus(id: string, newStatus: QuoteStatus, note = ''): Promise<Quote> {
    const current = await quotes.getOne(id);
    const updated = await quotes.update(id, { status: newStatus } as any);
    await history.create({
      quote_id:    id,
      user_name:   authStore.model?.name ?? 'Usuario',
      from_status: current.status,
      to_status:   newStatus,
      note,
    } as any);
    return updated;
  },

  async getHistory(quoteId: string): Promise<QuoteHistory[]> {
    const res = await history.list({
      filter:  `quote_id = "${quoteId}"`,
      sort:    '-created',
      perPage: 50,
    });
    return res.items;
  },
};
