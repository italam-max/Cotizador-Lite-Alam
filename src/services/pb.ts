// ARCHIVO: src/services/pb.ts
// Cliente PocketBase — reemplaza supabaseClient.ts
// ⚠️  Cambia VITE_PB_URL en tu .env por tu URL de pockethost.io
//     Ejemplo: VITE_PB_URL=https://alamex-cotizador.pockethost.io

export const POCKETBASE_URL = (import.meta.env.VITE_PB_URL as string) || 'https://TU-PROYECTO.pockethost.io';

// ─── TIPOS BASE ─────────────────────────────────────────────
export interface PBRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export interface UserRecord extends PBRecord {
  email: string;
  name: string;
  job_title: string;
  avatar: string;
  role: 'admin' | 'vendedor' | 'gerente';
  verified: boolean;
}

// ─── AUTH STORE (localStorage) ──────────────────────────────
const TOKEN_KEY = 'pb_token';
const MODEL_KEY = 'pb_model';

export const authStore = {
  get token(): string | null { return localStorage.getItem(TOKEN_KEY); },
  get model(): UserRecord | null {
    const raw = localStorage.getItem(MODEL_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  get isValid(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  },
  save(token: string, model: UserRecord) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MODEL_KEY, JSON.stringify(model));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MODEL_KEY);
  },
};

// ─── FETCH BASE ──────────────────────────────────────────────
async function pbFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authStore.token) headers['Authorization'] = authStore.token;

  const res = await fetch(`${POCKETBASE_URL}/api/${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

// ─── AUTH ────────────────────────────────────────────────────
export const pbAuth = {
  async login(email: string, password: string): Promise<UserRecord> {
    const data = await pbFetch<{ token: string; record: UserRecord }>(
      'collections/users/auth-with-password',
      { method: 'POST', body: JSON.stringify({ identity: email, password }) }
    );
    authStore.save(data.token, data.record);
    return data.record;
  },
  async logout() { authStore.clear(); },
  async refreshToken(): Promise<void> {
    if (!authStore.token) return;
    try {
      const data = await pbFetch<{ token: string; record: UserRecord }>(
        'collections/users/auth-refresh', { method: 'POST' }
      );
      authStore.save(data.token, data.record);
    } catch { authStore.clear(); }
  },
};

// ─── CRUD GENÉRICO ───────────────────────────────────────────
export interface ListResult<T> { page: number; perPage: number; totalItems: number; totalPages: number; items: T[]; }

export const pbCol = <T extends PBRecord>(col: string) => ({
  async list(params: Record<string, string | number> = {}): Promise<ListResult<T>> {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return pbFetch<ListResult<T>>(`collections/${col}/records?${qs}`);
  },
  async getOne(id: string): Promise<T> {
    return pbFetch<T>(`collections/${col}/records/${id}`);
  },
  async create(body: Omit<Partial<T>, keyof PBRecord>): Promise<T> {
    return pbFetch<T>(`collections/${col}/records`, { method: 'POST', body: JSON.stringify(body) });
  },
  async update(id: string, body: Omit<Partial<T>, keyof PBRecord>): Promise<T> {
    return pbFetch<T>(`collections/${col}/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  async delete(id: string): Promise<void> {
    await pbFetch(`collections/${col}/records/${id}`, { method: 'DELETE' });
  },
});
