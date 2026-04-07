// Buffer polyfill para @react-pdf/renderer en el browser
// No usamos import de 'buffer' para evitar conflicto con Rollup en producción
if (typeof (globalThis as any).Buffer === 'undefined') {
  // Polyfill mínimo de Buffer que necesita react-pdf
  (globalThis as any).Buffer = {
    from: (data: any, encoding?: string) => {
      if (typeof data === 'string') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    isBuffer: () => false,
    alloc: (size: number) => new Uint8Array(size),
    allocUnsafe: (size: number) => new Uint8Array(size),
    concat: (bufs: Uint8Array[]) => {
      const total = bufs.reduce((n, b) => n + b.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const b of bufs) { out.set(b, off); off += b.length; }
      return out;
    },
    isEncoding: () => false,
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
