// ARCHIVO: src/components/ui/PDFOptionsSection.tsx
// Accesorios opcionales del elevador — se configura en Paso 2 (Técnico)
// Controla qué aparece en la propuesta PDF del cliente

import { TODAS_SEGURIDADES, TODOS_EXTRAS_DESC } from '../../features/pdf/QuotePDF';

export interface PdfOptions {
  seguridades:        string[];   // cuáles seguridades aparecen en Pág. 4
  extras_descripcion: string[];   // cuáles extras aparecen en la descripción (Pág. 2)
  mostrar_normativa:  boolean;    // bloque normativa (Pág. 4 — junto a Puertas)
  mostrar_calidad:    boolean;    // bloque calidad   (Pág. 4 — junto a Cabina)
  mostrar_ventajas:   boolean;    // bloque ventajas  (Pág. 4 — junto a Seguridades)
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  seguridades:        [...TODAS_SEGURIDADES],
  extras_descripcion: [...TODOS_EXTRAS_DESC],
  mostrar_normativa:  true,
  mostrar_calidad:    true,
  mostrar_ventajas:   true,
};

interface Props {
  value:    PdfOptions;
  onChange: (opts: PdfOptions) => void;
}

// ── Toggle switch ────────────────────────────────────────────
function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out ${
        active ? 'border-[#0A2463] bg-[#0A2463]' : 'border-gray-300 bg-gray-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
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
    // mantener el orden del catálogo
    set({ seguridades: TODAS_SEGURIDADES.filter(x => next.includes(x)) });
  };

  const toggleExtra = (e: string, checked: boolean) => {
    const next = checked
      ? [...value.extras_descripcion, e]
      : value.extras_descripcion.filter(x => x !== e);
    set({ extras_descripcion: TODOS_EXTRAS_DESC.filter(x => next.includes(x)) });
  };

  const allSeg   = value.seguridades.length === TODAS_SEGURIDADES.length;
  const allExtra = value.extras_descripcion.length === TODOS_EXTRAS_DESC.length;

  return (
    <div className="space-y-5">

      {/* ── 1. Extras en descripción ─────────────────────── */}
      {/* Estos aparecen en la línea de descripción de la Pág. 2 del PDF */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-black text-[#0A2463]/60 uppercase tracking-wider">
              Extras en descripción de cotización
            </p>
            <p className="text-[9px] text-[#0A2463]/35 mt-0.5">
              Aparecen en la descripción del equipo — Pág. 2
            </p>
          </div>
          <button
            type="button"
            onClick={() => set({ extras_descripcion: allExtra ? [] : [...TODOS_EXTRAS_DESC] })}
            className="text-[9px] font-bold text-[#0A2463]/50 hover:text-[#0A2463] underline transition-colors"
          >
            {allExtra ? 'Quitar todos' : 'Todos'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TODOS_EXTRAS_DESC.map(extra => (
            <CheckItem
              key={extra}
              label={extra}
              active={value.extras_descripcion.includes(extra)}
              onChange={checked => toggleExtra(extra, checked)}
            />
          ))}
        </div>
      </div>

      {/* ── 2. Seguridades incluidas ─────────────────────── */}
      {/* Aparecen como lista de bullets en la Pág. 4 del PDF */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-black text-[#0A2463]/60 uppercase tracking-wider">
              Seguridades incluidas
            </p>
            <p className="text-[9px] text-[#0A2463]/35 mt-0.5">
              Lista de seguridades que aparece en la propuesta — Pág. 4
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

      {/* ── 3. Opciones de presentación ──────────────────── */}
      {/* Bloques de texto opcionales que aparecen en Pág. 4 */}
      <div>
        <p className="text-[10px] font-black text-[#0A2463]/60 uppercase tracking-wider mb-1">
          Bloques de texto en propuesta
        </p>
        <p className="text-[9px] text-[#0A2463]/35 mb-3">
          Información adicional que puede incluirse u omitirse — Pág. 4
        </p>
        <div className="space-y-2">
          {[
            { key: 'mostrar_normativa' as const, label: 'Normativa aplicable (EN 81-20 / NOM-53)' },
            { key: 'mostrar_calidad'   as const, label: 'Calidad y estándares' },
            { key: 'mostrar_ventajas'  as const, label: 'Ventajas del sistema ALAMEX' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-gray-100">
              <p className="text-[11px] font-semibold text-[#0A2463]">{label}</p>
              <Toggle active={value[key]} onChange={v => set({ [key]: v })} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
