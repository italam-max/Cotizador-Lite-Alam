// ARCHIVO: src/components/ui/PDFOptionsSection.tsx
// Accesorios opcionales — obligatorio elegir una opción antes de guardar.
// Arranca en estado neutro (ninguna opción marcada) para forzar la revisión.

import { AlertTriangle, ShieldCheck, ShieldOff } from 'lucide-react';
import { TODAS_SEGURIDADES } from '../../features/pdf/QuotePDF';

export interface PdfOptions {
  seguridades:     string[];
  control_id?:     string;
  sin_accesorios?: boolean;   // true = sin accesorios | false/undefined = no elegido aún o con accesorios
}

// Estado inicial: neutro — ninguna opción pre-seleccionada
export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  seguridades:    [],
  control_id:     '',
  sin_accesorios: undefined,
};

interface Props {
  value:    PdfOptions;
  onChange: (opts: PdfOptions) => void;
}

// ── Checkbox item ────────────────────────────────────────────
function CheckItem({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
      active
        ? 'bg-[#0A2463]/6 border-[#0A2463]/20 text-[#0A2463]'
        : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
    }`}>
      <input
        type="checkbox"
        checked={active}
        onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-[#0A2463]"
      />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </label>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function PDFOptionsSection({ value, onChange }: Props) {
  const set = (partial: Partial<PdfOptions>) => onChange({ ...value, ...partial });

  const sinActivo = value.sin_accesorios === true;
  const conActivo = value.sin_accesorios !== true && value.seguridades.length > 0;
  // Pendiente: ninguna opción elegida
  const pendiente = !sinActivo && !conActivo;

  const allSeg = value.seguridades.length === TODAS_SEGURIDADES.length;

  const toggleSeguridad = (s: string, checked: boolean) => {
    const next = checked
      ? [...value.seguridades, s]
      : value.seguridades.filter(x => x !== s);
    set({ seguridades: TODAS_SEGURIDADES.filter(x => next.includes(x)), sin_accesorios: false });
  };

  return (
    <div className="space-y-4">

      {/* ── Banner de alerta cuando está pendiente ── */}
      {pendiente && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border-2 border-amber-300">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <p className="text-[12px] font-bold text-amber-700">
            Debes seleccionar una opción antes de guardar
          </p>
        </div>
      )}

      {/* ── Botones de elección ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

        {/* CON accesorios */}
        <button
          type="button"
          onClick={() => set({ sin_accesorios: false, seguridades: allSeg || conActivo ? value.seguridades : [...TODAS_SEGURIDADES] })}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all"
          style={{
            borderColor: conActivo ? '#0A2463' : '#e2e8f0',
            background:  conActivo ? '#0A2463' : 'white',
            color:       conActivo ? 'white'   : '#0A2463',
          }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: conActivo ? 'rgba(212,175,55,0.20)' : '#f1f5f9' }}>
            <ShieldCheck size={16} style={{ color: conActivo ? '#D4AF37' : '#64748b' }} />
          </div>
          <p className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Con accesorios opcionales
          </p>
        </button>

        {/* SIN accesorios */}
        <button
          type="button"
          onClick={() => set({ sin_accesorios: true, seguridades: [] })}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all"
          style={{
            borderColor: sinActivo ? '#0A2463' : '#e2e8f0',
            background:  sinActivo ? '#0A2463' : 'white',
            color:       sinActivo ? 'white'   : '#0A2463',
          }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: sinActivo ? 'rgba(212,175,55,0.20)' : '#f1f5f9' }}>
            <ShieldOff size={16} style={{ color: sinActivo ? '#D4AF37' : '#64748b' }} />
          </div>
          <p className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Sin accesorios opcionales
          </p>
        </button>
      </div>

      {/* ── Lista de seguridades (solo cuando CON accesorios está activo) ── */}
      {conActivo && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-[#0A2463]/60 uppercase tracking-wider">
              Seguridades adicionales
            </p>
            <button
              type="button"
              onClick={() => set({ seguridades: allSeg ? [] : [...TODAS_SEGURIDADES], sin_accesorios: false })}
              className="text-[9px] font-bold text-[#0A2463]/50 hover:text-[#0A2463] underline transition-colors"
            >
              {allSeg ? 'Quitar todas' : 'Seleccionar todas'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {TODAS_SEGURIDADES.map(seg => (
              <CheckItem
                key={seg}
                label={seg}
                active={value.seguridades.includes(seg)}
                onChange={checked => toggleSeguridad(seg, checked)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
