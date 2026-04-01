// ARCHIVO: src/services/supabase.ts
// Cliente Supabase — reemplaza pb.ts
// ⚠️  Pon tus credenciales en .env:
//     VITE_SUPABASE_URL=https://xxxx.supabase.co
//     VITE_SUPABASE_ANON_KEY=eyJ...

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!URL || !KEY) {
  console.error('⚠️  Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
}

export const supabase = createClient<Database>(URL, KEY);

// ─── Helper de usuario actual ────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Helper de perfil ────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}
