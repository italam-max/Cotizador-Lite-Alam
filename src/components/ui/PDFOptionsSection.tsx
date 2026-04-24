// ARCHIVO: src/components/ui/PDFOptionsSection.tsx
// Accesorios opcionales del elevador — se configura en Paso 2 (Técnico)
// Controla qué seguridades adicionales aparecen en la propuesta PDF

import { TODAS_SEGURIDADES } from '../../features/pdf/QuotePDF';

export interface PdfOptions {
  seguridades: string[];   // cuáles seguridades adicionales aparecen en Pág. 4
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  seguridades: [...TODAS_SEGURIDADES],
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

  const toggleSeguridad = (s: string, checked: boolean) => {
    const next = checked
      ? [...value.seguridades, s]
      : value.seguridades.filter(x => x !== s);
    set({ seguridades: TODAS_SEGURIDADES.filter(x => next.includes(x)) });
  };

  const allSeg = value.seguridades.length === TODAS_SEGURIDADES.length;

  return (
    <div className="space-y-5">

      {/* ── Seguridades adicionales ──────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-black text-[#0A2463]/60 uppercase tracking-wider">
              Seguridades adicionales
            </p>
            <p className="text-[9px] text-[#0A2463]/35 mt-0.5">
              Aparecen en la propuesta — Pág. 4
            </p>
          </div>
          <button
            type="button"
            onClick={() => set({ seguridades: allSeg ? [] : [...TODAS_SEGURIDADES] })}
            className="text-[9px] font-bold text-[#0A2463]/50 hover:text-[#0A2463] underline transition-colors"
          >
            {allSeg ? 'Quitar todas' : 'Todas'}
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

    </div>
  );
}
