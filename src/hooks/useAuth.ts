// ARCHIVO: src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { authStore, pbAuth } from '../services/pb';
import type { UserRecord } from '../types';

export function useAuth() {
  const [user, setUser]       = useState<UserRecord | null>(authStore.model);
  const [loading, setLoading] = useState(!authStore.isValid && !!authStore.token);

  // Refresh token al cargar si existe pero puede estar por vencer
  useEffect(() => {
    if (!authStore.token) { setLoading(false); return; }
    if (!authStore.isValid) { authStore.clear(); setUser(null); setLoading(false); return; }
    pbAuth.refreshToken()
      .then(() => setUser(authStore.model))
      .catch(() => { authStore.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await pbAuth.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await pbAuth.logout();
    setUser(null);
  }, []);

  return { user, loading, isLoggedIn: !!user, login, logout };
}
