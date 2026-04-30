// ARCHIVO: src/contexts/ThemeContext.tsx
// Modo oscuro pausado — siempre claro por ahora
import { createContext, useContext, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeCtx { theme: Theme; toggle: () => void; isDark: boolean; }

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('alam-theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggle: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
