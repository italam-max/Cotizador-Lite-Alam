// ARCHIVO: src/components/ErrorBoundary.tsx
// Error boundary global — captura errores de render y muestra pantalla amigable
// Diseño coherente con el sistema: fondo oscuro navy, gold accent
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props  { children: ReactNode }
interface State  { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error desconocido' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En producción se podría enviar a Sentry u otro servicio aquí
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-6 px-8 text-center"
        style={{ background: 'linear-gradient(180deg, #040D1A 0%, #0A1628 100%)' }}
      >
        {/* Icono con glow */}
        <div className="relative">
          <div className="absolute -inset-6 bg-[#D4AF37]/10 rounded-full blur-2xl" />
          <div className="relative w-20 h-20 rounded-3xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-xl flex items-center justify-center">
            <AlertTriangle size={36} className="text-[#D4AF37]" />
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2 max-w-md">
          <h2
            className="text-2xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Algo salió mal
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">
            Ocurrió un error inesperado en la aplicación. Puedes intentar recargar la página
            o contactar a soporte si el problema persiste.
          </p>
          {this.state.message && (
            <p className="text-xs font-mono text-[#D4AF37]/60 bg-black/30 px-4 py-2 rounded-lg border border-white/5 mt-2 break-all">
              {this.state.message}
            </p>
          )}
        </div>

        {/* Botón reload */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-[#051338] relative overflow-hidden group transition-all hover:-translate-y-0.5 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
            boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <RefreshCw size={15} className="relative z-10" />
          <span className="relative z-10">Recargar</span>
        </button>
      </div>
    );
  }
}
