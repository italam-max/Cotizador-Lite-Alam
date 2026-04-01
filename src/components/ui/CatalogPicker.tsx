// ARCHIVO: src/components/ui/CatalogPicker.tsx

import { useState } from 'react';
import { X, Check, ZoomIn } from 'lucide-react';

export interface CatalogItem {
  id:    string;
  label: string;
  img:   string;
  desc?: string;
}

// ══════════════════════════════════════════════════════════════
// FICHA TÉCNICA COMPLETA — estilo catálogo
// Se abre automáticamente al hacer clic en un modelo de cabina
// ══════════════════════════════════════════════════════════════
interface CabinSheetProps {
  cabinModel: CatalogItem;
  finish?:    CatalogItem | null;
  floor?:     CatalogItem | null;
  plafon?:    CatalogItem | null;
  selected:   boolean;
  onSelect:   () => void;
  onClose:    () => void;
}

export function CabinSheet({ cabinModel, finish, floor, plafon, selected, onSelect, onClose }: CabinSheetProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(4,13,26,0.92)', backdropFilter: 'blur(14px)' }}
      onClick={onClose}>
      <div
        className="relative bg-white w-full mx-4 overflow-hidden"
        style={{
          maxWidth: 780,
          borderRadius: 24,
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Cerrar */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-all">
          <X size={18} style={{ color: '#0A2463' }} />
        </button>

        {/* Header azul navy */}
        <div className="px-8 py-5"
          style={{ background: 'linear-gradient(90deg, #051338 0%, #0A2463 60%, #1B3A6B 100%)', borderBottom: '3px solid #D4AF37' }}>
          <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-1">Modelo de cabina</p>
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            {cabinModel.id}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">{cabinModel.label}</p>
        </div>

        {/* Contenido: 2 columnas */}
        <div className="flex min-h-[340px]">

          {/* LEFT — foto principal de la cabina */}
          <div className="w-64 shrink-0 relative overflow-hidden bg-[#0A2463]/6">
            <img src={cabinModel.img} alt={cabinModel.id}
              className="w-full h-full object-cover absolute inset-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            {/* Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <span className="text-6xl font-black text-[#0A2463]/8" style={{ fontFamily: "'Syne', sans-serif" }}>
                {cabinModel.id.split('-')[0]}
              </span>
              <span className="text-[10px] text-[#0A2463]/20 text-center px-6 leading-relaxed">
                Coloca la imagen en:<br />/public{cabinModel.img}
              </span>
            </div>
            {/* Badge en la foto */}
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-black text-white"
              style={{ background: 'rgba(10,36,99,0.85)', fontFamily: "'Syne', sans-serif" }}>
              {cabinModel.id}
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{ background: 'linear-gradient(to top, rgba(10,36,99,0.7), transparent)' }}>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Imagen referencial</p>
            </div>
          </div>

          {/* RIGHT — detalles */}
          <div className="flex-1 p-6 flex flex-col gap-4">

            {/* Muestras de configuración */}
            <div>
              <p className="text-xs font-black text-[#0A2463]/40 uppercase tracking-[0.15em] mb-3">
                Configuración seleccionada
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Coating | Acabado', item: finish    },
                  { label: 'Ceiling | Plafón',  item: plafon    },
                  { label: 'Floor | Piso',      item: floor     },
                ].map(({ label, item }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-[#0A2463]/40 uppercase tracking-wider mb-1.5 text-center">{label}</p>
                    <div className="w-full rounded-xl overflow-hidden bg-[#0A2463]/6 relative border border-[#0A2463]/10"
                      style={{ height: 72 }}>
                      {item?.img && (
                        <img src={item.img} alt={item.label} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div className="absolute inset-0 flex items-end px-2 pb-1.5"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}>
                        <p className="text-[9px] font-bold text-white leading-tight truncate">
                          {item?.id !== item?.label ? (item?.id || '') : ''}{item ? ' · ' : ''}{item?.label || 'Sin seleccionar'}
                        </p>
                      </div>
                      {!item && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] text-[#0A2463]/30 font-medium">Sin seleccionar</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla bilingüe PROPERTIES / PROPRIÉTÉS */}
            <div className="flex-1">
              <p className="text-xs font-black text-[#0A2463]/40 uppercase tracking-[0.15em] mb-2">
                Características técnicas
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                {/* Header */}
                <div className="grid grid-cols-2"
                  style={{ background: '#0A2463' }}>
                  <div className="px-4 py-2.5 border-r border-white/10">
                    <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Properties</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Propriétés</p>
                  </div>
                </div>
                {/* Filas */}
                {[
                  ['Coating',    finish?.label  || 'INOX',         'Revêtement', finish?.label  || 'INOX'],
                  ['Ceiling',    plafon?.id     || 'LV-29',        'Plafond',    plafon?.id     || 'LV-29'],
                  ['Floor',      floor?.label   || 'Natural Granite','Sol',       floor?.label   || 'Granito'],
                  ['Accessories','Mirror Stainless',                'Accessoire', 'Inoxydable'],
                  ['Handrail',   'Chrome Stainless Nickel',         'Main courante','Chrome Inox Nickel'],
                  ['Side Wall',  'Stainless',                       'Paroi latérale','Inox'],
                ].map(([en, ev, fr, fv], i) => (
                  <div key={i} className="grid grid-cols-2 border-b last:border-0"
                    style={{ borderColor: '#f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <div className="px-4 py-2 border-r" style={{ borderColor: '#f1f5f9' }}>
                      <span className="text-xs font-bold text-[#0A2463]/50">• {en}: </span>
                      <span className="text-xs text-[#0A2463] font-medium">{ev}</span>
                    </div>
                    <div className="px-4 py-2">
                      <span className="text-xs font-bold text-[#0A2463]/50">• {fr}: </span>
                      <span className="text-xs text-[#0A2463] font-medium">{fv}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer — botón confirmar */}
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-[#0A2463]/15 text-[#0A2463]/50 hover:bg-[#0A2463]/5 transition-all">
            Cancelar
          </button>
          <button onClick={() => { onSelect(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white uppercase tracking-wide transition-all active:scale-[0.98]"
            style={{
              background: selected ? '#10b981' : 'linear-gradient(135deg, #0A2463, #1B3A6B)',
              fontFamily: "'Syne', sans-serif",
              boxShadow: '0 4px 20px rgba(10,36,99,0.25)',
            }}>
            <Check size={16} />
            {selected ? `${cabinModel.id} seleccionado ✓` : `Seleccionar ${cabinModel.id}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LIGHTBOX GENÉRICO — para acabados, pisos, plafones
// ══════════════════════════════════════════════════════════════
interface LightboxProps {
  item:     CatalogItem;
  selected: boolean;
  onSelect: () => void;
  onClose:  () => void;
}

function Lightbox({ item, selected, onSelect, onClose }: LightboxProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(4,13,26,0.90)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="relative bg-white w-80 mx-4 overflow-hidden"
        style={{ borderRadius: 20, border: '2px solid rgba(212,175,55,0.3)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white shadow hover:bg-gray-50 transition-all">
          <X size={16} style={{ color: '#0A2463' }} />
        </button>

        {/* Foto grande */}
        <div className="w-full h-52 bg-[#0A2463]/8 relative overflow-hidden">
          <img src={item.img} alt={item.label} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {/* Placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <span className="text-5xl font-black text-[#0A2463]/8" style={{ fontFamily: "'Syne', sans-serif" }}>{item.id}</span>
            <span className="text-[9px] text-[#0A2463]/20 px-6 text-center leading-relaxed">
              Coloca la imagen en:<br />/public{item.img}
            </span>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm font-black text-[#0A2463] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{item.id}</p>
          <p className="text-xs text-[#0A2463]/50 mb-4">{item.label}</p>
          <button onClick={() => { onSelect(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white uppercase tracking-wide transition-all active:scale-95"
            style={{
              background: selected ? '#10b981' : '#0A2463',
              fontFamily: "'Syne', sans-serif",
              boxShadow: '0 4px 16px rgba(10,36,99,0.2)',
            }}>
            <Check size={15} />
            {selected ? 'Seleccionado ✓' : 'Seleccionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ITEM CARD — thumbnail pequeño con hover
// ══════════════════════════════════════════════════════════════
interface ItemCardProps {
  item:     CatalogItem;
  selected: boolean;
  onClick:  () => void;
  width?:   number;
  height?:  number;
}

function ItemCard({ item, selected, onClick, width = 80, height = 64 }: ItemCardProps) {
  return (
    <button type="button" onClick={onClick}
      className="relative rounded-xl overflow-hidden border-2 transition-all group shrink-0"
      style={{ borderColor: selected ? '#0A2463' : '#e2e8f0', width }}>
      <div className="overflow-hidden relative bg-[#0A2463]/8" style={{ height }}>
        <img src={item.img} alt={item.label} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {/* Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(10,36,99,0.6)' }}>
          <ZoomIn size={16} color="white" />
        </div>
        {/* Selected */}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(10,36,99,0.4)' }}>
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Check size={13} color="#0A2463" strokeWidth={3} />
            </div>
          </div>
        )}
        {/* Placeholder label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span className="text-[8px] font-black text-[#0A2463] text-center px-1 leading-tight">{item.id}</span>
        </div>
      </div>
      <div className="px-1.5 py-1" style={{ background: selected ? '#0A2463' : 'white' }}>
        <p className="text-[9px] font-bold text-center truncate" style={{ color: selected ? 'white' : '#475569', fontFamily: "'Syne', sans-serif" }}>
          {item.id || item.label}
        </p>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// CatalogPicker — selector con lightbox genérico
// Para acabados, pisos y plafones (NO para cabinas — esas usan CabinItemCard)
// ══════════════════════════════════════════════════════════════
interface CatalogPickerProps {
  title:    string;
  items:    CatalogItem[];
  value:    string;
  matchBy?: 'id' | 'label';
  onSelect: (item: CatalogItem) => void;
  width?:   number;
  height?:  number;
  hint?:    string;
}

export default function CatalogPicker({ title, items, value, matchBy = 'label', onSelect, width = 72, height = 56, hint }: CatalogPickerProps) {
  const [lightboxItem, setLightboxItem] = useState<CatalogItem | null>(null);

  return (
    <div className="col-span-2">
      <label className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[#0A2463]/70 uppercase tracking-wider">{title}</span>
        {hint && <span className="text-[10px] text-[#D4AF37]/70 font-medium italic">{hint}</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const sel = matchBy === 'id' ? value === item.id : value === item.label;
          return (
            <ItemCard key={item.id} item={item} selected={sel}
              onClick={() => setLightboxItem(item)}
              width={width} height={height} />
          );
        })}
      </div>
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          selected={matchBy === 'id' ? value === lightboxItem.id : value === lightboxItem.label}
          onSelect={() => onSelect(lightboxItem)}
          onClose={() => setLightboxItem(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CabinItemCard — thumbnail de cabina que abre la ficha técnica
// DIFERENCIA clave: al hacer clic abre CabinSheet (ficha completa)
// en vez del lightbox genérico
// ══════════════════════════════════════════════════════════════
interface CabinItemCardProps {
  item:       CatalogItem;
  selected:   boolean;
  onSelect:   () => void;
  finish?:    CatalogItem | null;
  floor?:     CatalogItem | null;
  plafon?:    CatalogItem | null;
}

export function CabinItemCard({ item, selected, onSelect, finish, floor, plafon }: CabinItemCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {sheetOpen && (
        <CabinSheet
          cabinModel={item}
          finish={finish}
          floor={floor}
          plafon={plafon}
          selected={selected}
          onSelect={onSelect}
          onClose={() => setSheetOpen(false)}
        />
      )}
      <button type="button"
        onClick={() => setSheetOpen(true)}   // ← abre ficha directamente
        className="relative rounded-xl overflow-hidden border-2 transition-all group shrink-0"
        style={{ borderColor: selected ? '#0A2463' : '#e2e8f0', width: 100 }}>
        {/* Thumbnail */}
        <div className="relative bg-[#0A2463]/8" style={{ height: 80 }}>
          <img src={item.img} alt={item.label} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1"
            style={{ background: 'rgba(10,36,99,0.7)' }}>
            <ZoomIn size={18} color="white" />
            <span className="text-[9px] font-bold text-white">Ver ficha</span>
          </div>
          {/* Check selected */}
          {selected && (
            <div className="absolute inset-0 flex items-start justify-end p-1.5">
              <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                <Check size={11} color="#0A2463" strokeWidth={3} />
              </div>
            </div>
          )}
          {/* Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
            <span className="text-[9px] font-black text-[#0A2463] text-center px-1 leading-tight">{item.id}</span>
          </div>
        </div>
        {/* Label */}
        <div className="px-2 py-1.5" style={{ background: selected ? '#0A2463' : 'white' }}>
          <p className="text-[10px] font-black text-center leading-tight" style={{ color: selected ? 'white' : '#0A2463', fontFamily: "'Syne', sans-serif" }}>
            {item.id}
          </p>
          <p className="text-[8px] text-center truncate mt-0.5" style={{ color: selected ? 'white/70' : '#94a3b8' }}>
            {item.label.replace(item.id + ' — ', '').substring(0, 16)}
          </p>
        </div>
      </button>
    </>
  );
}
