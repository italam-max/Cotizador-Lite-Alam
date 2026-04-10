// ARCHIVO: src/components/ui/ToastContainer.tsx
// Toasts — diseño coherente con el sistema: navy/gold/glassmorphism
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

interface Props {
  toasts:  Toast[];
  dismiss: (id: string) => void;
}

const CONFIG = {
  success: {
    icon:    CheckCircle2,
    bar:     '#22c55e',
    iconCls: 'text-emerald-400',
    label:   'Éxito',
  },
  error: {
    icon:    XCircle,
    bar:     '#ef4444',
    iconCls: 'text-red-400',
    label:   'Error',
  },
  info: {
    icon:    Info,
    bar:     '#D4AF37',
    iconCls: 'text-[#D4AF37]',
    label:   'Info',
  },
};

export default function ToastContainer({ toasts, dismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => {
        const cfg  = CONFIG[toast.type];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 w-80 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.45)] animate-slide-in"
            style={{
              background: 'linear-gradient(135deg, rgba(5,19,56,0.97) 0%, rgba(10,36,99,0.97) 100%)',
              border: '1px solid rgba(212,175,55,0.2)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Barra lateral de color */}
            <div className="w-1 self-stretch shrink-0 rounded-l-2xl" style={{ background: cfg.bar }} />

            {/* Ícono */}
            <div className="pt-3.5 shrink-0">
              <Icon size={18} className={cfg.iconCls} />
            </div>

            {/* Texto */}
            <div className="flex-1 py-3 pr-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] opacity-70 mb-0.5">
                {cfg.label}
              </p>
              <p className="text-sm font-medium text-white/90 leading-snug break-words">
                {toast.message}
              </p>
            </div>

            {/* Cerrar */}
            <button
              onClick={() => dismiss(toast.id)}
              className="p-3 text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
