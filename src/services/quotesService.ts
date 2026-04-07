/// <reference types="vite/client" />
// ARCHIVO: src/services/quotesService.ts
import { supabase, getCurrentUser } from './supabase';
import type { Quote, QuoteHistory, QuoteStatus } from '../types';

// Supabase client con cast para evitar conflictos de generics estrictos
const db = supabase as any;

export async function nextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await db.from('quotes')
    .select('folio')
    .ilike('folio', `ALAM-${year}-%`)
    .order('folio', { ascending: false })
    .limit(1);
  if (!data?.length) return `ALAM-${year}-001`;
  const num = parseInt(data[0].folio.split('-')[2] ?? '0') + 1;
  return `ALAM-${year}-${String(num).padStart(3, '0')}`;
}

export const QuotesService = {
  async getAll(): Promise<Quote[]> {
    const { data, error } = await db.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Quote[];
  },

  async getOne(id: string): Promise<Quote> {
    const { data, error } = await db.from('quotes').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Quote;
  },

  async create(body: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> {
    const user = await getCurrentUser();
    const { data, error } = await db.from('quotes')
      .insert({ ...body, owner_id: user?.id ?? '' })
      .select()
      .single();
    if (error) throw error;

    await db.from('quote_history').insert({
      quote_id:    (data as any).id,
      user_id:     user?.id ?? null,
      user_name:   user?.user_metadata?.full_name ?? user?.email ?? 'Sistema',
      from_status: null,
      to_status:   body.status,
      note:        'Cotización creada',
    });

    return data as Quote;
  },

  async update(id: string, body: Partial<Quote>): Promise<Quote> {
    const { data, error } = await db.from('quotes')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Quote;
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from('quotes').delete().eq('id', id);
    if (error) throw error;
  },

  async changeStatus(id: string, newStatus: QuoteStatus, note = ''): Promise<Quote> {
    const current = await this.getOne(id);
    const updated = await this.update(id, { status: newStatus });
    const user    = await getCurrentUser();

    await db.from('quote_history').insert({
      quote_id:    id,
      user_id:     user?.id ?? null,
      user_name:   user?.user_metadata?.full_name ?? user?.email ?? 'Usuario',
      from_status: current.status,
      to_status:   newStatus,
      note:        note || null,
    });

    return updated;
  },

  async getHistory(quoteId: string): Promise<QuoteHistory[]> {
    const { data, error } = await db.from('quote_history')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as QuoteHistory[];
  },
};
