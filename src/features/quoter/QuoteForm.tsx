// ARCHIVO: src/features/quoter/QuoteForm.tsx
// Ajustes aplicados:
// 1. Tracción = siempre "Cable de Acero" (no editable, info only)
// 2. Control de grupo eliminado del formulario
// 3. Dimensiones: alertas si están por debajo del estándar + fuerza proveedor Turco
// 4. Tipo de puerta con lógica MRL-L izq/der (Central / Apertura Der. / Apertura Izq.)
// 5. Cabina Carga → piso Epóxico, acabado Epóxico Industrial automático
// 6. Botoneras y normativa simplificados / opcionales
// 7. Estado siempre "Por Enviar" al guardar
// 8. Notas internas conservadas
// 9. Al guardar → vista previa PDF antes de descargar/enviar

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, Save, Loader2,
  User, Settings2, DollarSign, AlertTriangle,
  CheckCircle2, Info, Sparkles, FileText, Mail,
  Download, Eye
} from 'lucide-react';
import CatalogPicker from '../../components/ui/CatalogPicker';
import CabinConfigurator from '../../components/ui/CabinConfigurator';
import { QuotesService, nextFolio } from '../../services/quotesService';
import {
  computeDefaults, getAllowedModels, getAllowedSpeeds,
  validate, CAPACITIES, CAPACITY_PERSONS,
  CABIN_WALLS, CABIN_EXTRAS, FLOOR_FINISHES, PLAFONOS,
  generateFloorNomenclature, autoRails, autoTractionLabel, buildCabinDescription
} from '../../data/engineRules';
import type { Quote } from '../../types';
import { EMPTY_QUOTE } from '../../types';
import PDFOptionsSection, { DEFAULT_PDF_OPTIONS, type PdfOptions } from '../../components/ui/PDFOptionsSection';

interface Props {
  quote:       Quote | null;
  sellerName:  string;
  sellerTitle: string;
  onSaved:     () => void;
  onCancel:    () => void;
}

const STEPS = [
  { id: 1, label: 'Cliente',   icon: User      },
  { id: 2, label: 'Técnico',   icon: Settings2 },
  { id: 3, label: 'Comercial', icon: DollarSign },
];

type FormData = Omit<Quote, 'id' | 'created_at' | 'updated_at'>;

// ── Opciones de puertas según modelo / lado ─────────────────
function getDoorTypeOptions(model: string, doorSide: string) {
  if (model === 'MRL-L') {
    if (doorSide === 'Derecha')   return ['Automática Apertura Derecha', 'Manual Batiente Derecha'];
    if (doorSide === 'Izquierda') return ['Automática Apertura Izquierda', 'Manual Batiente Izquierda'];
  }
  return ['Automática Central', 'Telescópica Lateral', 'Manual Batiente'];
}

// ── Sub-componentes UI ──────────────────────────────────────
function SectionCard({ title, icon: Icon, note, children }: { title: string; icon?: any; note?: string; children: React.ReactNode }) {
  return (
    <div className="luxury-glass rounded-2xl p-6 border border-[#D4AF37]/10 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-black text-[#0A2463] uppercase tracking-[0.15em] flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[#D4AF37]" />}
          {title}
        </h3>
        {note && <span className="text-[10px] text-[#0A2463]/40 italic">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children, col }: { label: string; hint?: string; children: React.ReactNode; col?: string }) {
  return (
    <div className={col}>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-[#0A2463]/70 uppercase tracking-wider">{label}</span>
        {hint && <span className="text-[10px] text-[#D4AF37]/70 font-medium">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Estilos inputs ──────────────────────────────────────────
const INPUT    = "w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0A2463] bg-white border border-[#0A2463]/10 outline-none transition-all placeholder-[#0A2463]/25 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 hover:border-[#0A2463]/20";
const INPUT_RO = "w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0A2463]/50 bg-[#0A2463]/5 border border-[#0A2463]/8 outline-none cursor-default";
const INPUT_ERR= "w-full px-4 py-3 rounded-xl text-sm font-medium bg-red-50 border border-red-300 text-red-700 outline-none focus:ring-2 focus:ring-red-100";
const INPUT_WARN="w-full px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 border border-amber-300 text-amber-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
const SELECT   = INPUT + " appearance-none cursor-pointer";

// ── Vista previa PDF (modal) ────────────────────────────────
function PDFPreviewModal({
  quote, sellerName, sellerTitle, onClose
}: {
  quote: Quote; sellerName: string; sellerTitle: string; onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [sending,     setSending]     = useState(false);
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const total = (quote.price || 0) * (quote.quantity || 1);
  const isMRL = quote.model.includes('MRL');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { pdf }              = await import('@react-pdf/renderer');
      const { QuotePDFDocument } = await import('../pdf/QuotePDF');
      const React = await import('react');
      const element = React.createElement(QuotePDFDocument as any, {
        quote, seller: sellerName, sellerTitle
      });
      const contentBlob = await pdf(element as any).toBlob();
      const { mergeAndDownload } = await import('../../services/pdfMerge');
      const filename = `${quote.folio}_${quote.client_name}.pdf`.replace(/\s+/g, '_');
      await mergeAndDownload(contentBlob, quote.folio, quote.client_name, filename);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Error al generar PDF');
    } finally { setDownloading(false); }
  };

  const handleSendEmail = async () => {
    if (!quote.client_email) { alert('Esta cotización no tiene email de cliente registrado.'); return; }
    setSending(true);
    // Por ahora abre el cliente de correo con mailto
    // En producción aquí iría la llamada al backend de email
    const subject = encodeURIComponent(`Cotización ${quote.folio} — Elevadores Alamex`);
    const body    = encodeURIComponent(
      `Estimado/a ${quote.client_name},\n\nAdjunto encontrará la cotización ${quote.folio} para el suministro e instalación de ${quote.quantity} elevador(es) ${quote.model}.\n\nTotal: ${fmt.format(total)} MXN + IVA\n\nQuedamos a sus órdenes.\n\n${sellerName}\n${sellerTitle}\nElevadores Alamex S.A. de C.V.`
    );
    window.open(`mailto:${quote.client_email}?subject=${subject}&body=${body}`);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(4,13,26,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-slide-up"
        style={{ border: '1px solid rgba(212,175,55,0.2)' }}>

        {/* Header modal */}
        <div className="px-7 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #051338, #0A2463)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[#D4AF37]" />
            <div>
              <p className="font-black text-white text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                Vista Previa — {quote.folio}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">{quote.client_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl font-bold px-2">✕</button>
        </div>

        {/* Resumen de la cotización */}
        <div className="px-7 py-6 space-y-4" style={{ background: '#F9F7F2' }}>

          {/* Specs principales */}
          <div className="luxury-glass rounded-2xl p-5 border border-[#D4AF37]/15">
            <p className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-widest mb-4">Especificaciones técnicas</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Modelo',    value: quote.model },
                { label: 'Uso',       value: quote.use_type },
                { label: 'Capacidad', value: `${quote.capacity} kg` },
                { label: 'Velocidad', value: `${quote.speed} m/s` },
                { label: 'Paradas',   value: `${quote.stops} niveles` },
                { label: 'Recorrido', value: `${((quote.travel||0)/1000).toFixed(1)} m` },
                !isMRL ? { label: 'Fosa',  value: `${quote.pit} mm` } : null,
                !isMRL ? { label: 'Huida', value: `${quote.overhead} mm` } : null,
                { label: 'Cubo',      value: `${quote.shaft_width}×${quote.shaft_depth}` },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label}>
                  <p className="text-[10px] text-[#0A2463]/40 uppercase font-bold">{item.label}</p>
                  <p className="text-sm font-semibold text-[#0A2463] mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Precio */}
          <div className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: '#0A2463' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1">
                Inversión total — {quote.quantity} equipo{quote.quantity > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-white/40">
                {quote.client_email
                  ? `Se enviará a: ${quote.client_email}`
                  : 'Sin email de cliente registrado'}
              </p>
            </div>
            <p className="font-black text-3xl text-[#D4AF37]"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              {fmt.format(total)}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-7 py-5 flex gap-3 bg-white border-t border-gray-100">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">
            Volver a editar
          </button>
          <button onClick={handleSendEmail} disabled={sending || !quote.client_email}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all border-2 border-[#0A2463] text-[#0A2463] hover:bg-[#0A2463]/5 disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Enviar por correo
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function QuoteForm({ quote, sellerName, sellerTitle, onSaved, onCancel }: Props) {
  const [step,       setStep]       = useState(1);
  const [form,       setForm]       = useState<FormData>(() => (quote ? { ...EMPTY_QUOTE, ...quote } : { ...EMPTY_QUOTE, owner_id: '' }) as FormData);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState<{ field: string; msg: string }[]>([]);
  const [warnings,   setWarnings]   = useState<{ field: string; msg: string }[]>([]);
  const [savedQuote, setSavedQuote] = useState<Quote | null>(null); // para modal PDF
  const [cabinImage,  setCabinImage]  = useState<string>('');           // imagen capturada del configurador
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>(() => {
    if ((quote as any)?.pdf_options) {
      try {
        const raw = (quote as any).pdf_options;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch { return DEFAULT_PDF_OPTIONS; }
    }
    return DEFAULT_PDF_OPTIONS;
  });

  useEffect(() => {
    if (!quote && !form.folio) {
      nextFolio().then(f => setForm(p => ({ ...p, folio: f })));
    }
  }, []);

  const update = useCallback((fields: Partial<FormData>) => {
    setForm(prev => {
      const next = { ...prev, ...fields };
      const techKeys = ['capacity','stops','speed','model','quantity','use_type','door_side'] as const;
      const isTech = techKeys.some(k => k in fields);

      if (isTech) {
        const defaults = computeDefaults(next);
        const safe = { ...defaults };
        Object.keys(fields).forEach(k => delete (safe as any)[k]);
        const merged = { ...next, ...safe };

        // Ajuste 4: tipo de puerta según modelo + lado
        if (fields.model || fields.door_side) {
          const doorOpts = getDoorTypeOptions(merged.model, merged.door_side || 'N/A');
          if (!doorOpts.includes(merged.door_type || '')) {
            merged.door_type = doorOpts[0];
          }
        }

        // Al cambiar tipo de uso → sugerir pared y piso por defecto
        if (fields.use_type) {
          const useT = fields.use_type as string;
          if (useT === 'Carga' || useT === 'Montaplatos') {
            merged.cabin_finish = 'Epóxico Gris';   // wall finish
            merged.cabin_floor  = 'Epóxico Industrial (antiderrapante)';
          } else {
            merged.cabin_finish = 'INOX Mate';       // wall finish
            merged.cabin_floor  = 'Star Galaxy (granito negro)';
          }
          // Reset extras for new use type
          merged.cabin_model = '';
        }

        // Ajuste 3: dimensiones por debajo del estándar → forzar proveedor Turco
        // (se maneja en validación y se sugiere abajo)

        return merged;
      }

      // Ajuste 4: si cambia lado de apertura directamente
      if (fields.door_side) {
        const doorOpts = getDoorTypeOptions(next.model, fields.door_side as string);
        if (!doorOpts.includes(next.door_type || '')) {
          next.door_type = doorOpts[0];
        }
      }

      return next;
    });
  }, []);

  // Validación en tiempo real
  useEffect(() => {
    const { errors: e, warnings: w } = validate(form);

    // Ajuste 3: si dimensiones están por debajo del estándar, agregar warning
    const extraWarnings: typeof w = [];
    // fosa
    if (!form.model.includes('MRL') && form.model !== 'HYD') {
      // valores mínimos referenciales
      const minPit = 1100;
      const minOH  = 3500;
      if ((form.pit || 0) < minPit) {
        extraWarnings.push({ field: 'pit', msg: `Fosa (${form.pit}mm) por debajo del estándar (${minPit}mm). ⚠️ Requiere proveedor Turco (fabricación a medida).` });
        // auto-set proveedor turco
        if (form.supplier !== 'Turco') {
          setForm(p => ({ ...p, supplier: 'Turco' }));
        }
      }
      if ((form.overhead || 0) < minOH) {
        extraWarnings.push({ field: 'overhead', msg: `Sobrepaso (${form.overhead}mm) por debajo del estándar (${minOH}mm). ⚠️ Requiere proveedor Turco.` });
        if (form.supplier !== 'Turco') {
          setForm(p => ({ ...p, supplier: 'Turco' }));
        }
      }
    }

    setErrors(e);
    setWarnings([...w, ...extraWarnings]);
  }, [form]);

  const hasError = (f: string) => errors.some(e => e.field === f);
  const hasDimWarn = (f: string) => warnings.some(w => w.field === f && w.msg.includes('debajo'));
  const ic = (f: string) => hasError(f) ? INPUT_ERR : hasDimWarn(f) ? INPUT_WARN : INPUT;
  const sc = (f: string) => hasError(f) ? INPUT_ERR + ' cursor-pointer' : hasDimWarn(f) ? INPUT_WARN + ' cursor-pointer appearance-none' : SELECT;

  const allowedModels = getAllowedModels(form.capacity, form.stops, form.travel || (form.stops - 1) * 3000);
  const allowedSpeeds = getAllowedSpeeds(form.model, form.capacity, form.stops);
  const doorTypeOptions = getDoorTypeOptions(form.model, form.door_side || 'N/A');
  const isMRL  = form.model.includes('MRL');
  const isHyd  = form.model === 'HYD' || form.model === 'Home Lift';
  const fmt    = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const total  = (form.price || 0) * (form.quantity || 1);

  // Ajuste 7: estado siempre "Enviada" al guardar (Por Enviar)
  const handleSave = async () => {
    if (errors.length > 0) { setStep(2); return; }
    setSaving(true);
    try {
      // Construir descripción de cabina desde los atributos
      const extras: string[] = (() => { try { return JSON.parse(form.cabin_model || '[]'); } catch { return []; } })();
      const cabinDesc = buildCabinDescription(
        form.cabin_finish || '',
        extras,
        form.cabin_floor  || '',
        form.cop_model    || '',
        form.use_type     || 'Pasajeros'
      );
      const dataToSave = {
        ...form,
        status:      'Enviada' as const,
        cabin_model: cabinDesc, // guardamos la descripción generada
        pdf_options: pdfOptions,
      };
      let saved: Quote;
      if (quote?.id) {
        saved = await QuotesService.update(quote.id, dataToSave as any);
      } else {
        saved = await QuotesService.create(dataToSave);
      }
      // Ajuste 9: mostrar modal PDF
      setSavedQuote(saved);
    } catch (e: any) {
      alert('Error al guardar: ' + (e?.message ?? 'Error desconocido'));
    } finally { setSaving(false); }
  };

  const dimWarnings = warnings.filter(w => ['pit','overhead','shaft_width','shaft_depth'].includes(w.field) && w.msg.includes('debajo'));
  const techWarnings = warnings.filter(w => !['price','client_name'].includes(w.field) && !w.msg.includes('debajo'));
  const isMRL_L = form.model === 'MRL-L';

  return (
    <>
    {/* Modal PDF */}
    {savedQuote && (
      <PDFPreviewModal
        quote={savedQuote}
        sellerName={sellerName}
        sellerTitle={sellerTitle}
        onClose={() => { setSavedQuote(null); onSaved(); }}
      />
    )}

    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 arabesque-pattern opacity-30 pointer-events-none z-0" />
      <div className="ambient-light-bg opacity-40" />

      {/* HEADER */}
      <div className="relative z-10 px-6 py-4 shrink-0 flex items-center justify-between bg-white/60 backdrop-blur-md border-b border-[#D4AF37]/20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-xl text-[#0A2463]/50 hover:text-[#0A2463] hover:bg-[#0A2463]/5 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#0A2463] flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              <Sparkles size={16} className="text-[#D4AF37]" />
              {quote ? `Editando ${form.folio}` : 'Nueva Cotización'}
            </h1>
            <p className="text-[11px] text-[#0A2463]/50 mt-0.5 font-medium">
              {form.client_name || 'Sin cliente'} · {form.model} · {form.capacity} kg · {form.stops} paradas
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1 bg-[#0A2463]/5 rounded-xl p-1">
          {STEPS.map(s => {
            const active = step === s.id;
            const done   = step > s.id;
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: active ? '#0A2463' : 'transparent', color: active ? 'white' : done ? '#0A2463' : '#94a3b8' }}>
                {done ? <CheckCircle2 size={13} className="text-[#D4AF37]" /> : <s.icon size={13} />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Guardar */}
        <div className="flex items-center gap-3">
          {errors.length > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600">
              <AlertTriangle size={13} />
              {errors.length} error{errors.length > 1 ? 'es' : ''} en Paso 2
            </div>
          )}
          <button onClick={handleSave} disabled={saving || errors.length > 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: errors.length > 0 ? '#e2e8f0' : '#0A2463', color: errors.length > 0 ? '#94a3b8' : 'white', fontFamily: "'Syne', sans-serif" }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {saving ? 'Guardando...' : 'Guardar y ver PDF'}
          </button>
        </div>
      </div>

      {/* CUERPO */}
      <div className="flex-1 overflow-y-auto relative z-10 px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* ════ PASO 1 ════ */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <SectionCard title="Información del cliente" icon={User}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Field label="Nombre / Empresa *">
                      <input className={ic('client_name')} value={form.client_name}
                        onChange={e => update({ client_name: e.target.value })}
                        placeholder="Constructora XYZ S.A. de C.V." autoFocus />
                    </Field>
                  </div>
                  <Field label="Correo electrónico" hint="Para envío del PDF">
                    <input type="email" className={ic('client_email')} value={form.client_email || ''}
                      onChange={e => update({ client_email: e.target.value })}
                      placeholder="contacto@empresa.com" />
                  </Field>
                  <Field label="Teléfono">
                    <input className={ic('client_phone')} value={form.client_phone || ''}
                      onChange={e => update({ client_phone: e.target.value })}
                      placeholder="+52 55 0000 0000" />
                  </Field>
                  <Field label="Folio">
                    <input className={INPUT_RO + ' font-black text-[#D4AF37]'} value={form.folio} readOnly />
                  </Field>
                  <Field label="Fecha">
                    <input type="date" className={INPUT} value={form.project_date}
                      onChange={e => update({ project_date: e.target.value })} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Tipo de proyecto">
                <div className="grid grid-cols-3 gap-3">
                  {(['Pasajeros','Carga','Montaplatos'] as const).map(t => (
                    <button key={t} onClick={() => update({ use_type: t })}
                      className="py-4 px-5 rounded-xl text-left transition-all border-2"
                      style={{ background: form.use_type === t ? '#0A2463' : 'white', borderColor: form.use_type === t ? '#0A2463' : '#e2e8f0', color: form.use_type === t ? 'white' : '#0A2463' }}>
                      <p className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>{t}</p>
                      <p className="text-xs mt-0.5 opacity-60">
                        {t === 'Pasajeros' ? 'Cabina estándar' : t === 'Carga' ? 'Cabina ACC · Epóxico' : 'Uso de servicios · Epóxico'}
                      </p>
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════ PASO 2 ════ */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">

              {/* Errores críticos */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} /> Errores críticos — corrige antes de guardar
                  </p>
                  {errors.map((e, i) => <p key={i} className="text-xs text-red-600 pl-5">• {e.msg}</p>)}
                </div>
              )}

              {/* Advertencias técnicas */}
              {techWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <Info size={14} /> Advertencias de ingeniería
                  </p>
                  {techWarnings.map((w, i) => <p key={i} className="text-xs text-amber-700 pl-5">• {w.msg}</p>)}
                </div>
              )}

              {/* Dimensiones fuera de estándar */}
              {dimWarnings.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} /> Dimensiones fuera de estándar
                  </p>
                  {dimWarnings.map((w, i) => <p key={i} className="text-xs text-orange-700 pl-5">• {w.msg}</p>)}
                  <p className="text-xs font-bold text-orange-800 pl-5 mt-2">
                    → El proveedor se ha ajustado automáticamente a <strong>Turco</strong> (fabricación a medida).
                  </p>
                </div>
              )}

              {/* Modelo */}
              <SectionCard title="Modelo de equipo" icon={Settings2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allowedModels.map(m => (
                    <button key={m.id} onClick={() => update({ model: m.id })}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all border-2"
                      style={{ background: form.model === m.id ? '#0A2463' : 'white', borderColor: form.model === m.id ? '#0A2463' : '#e2e8f0', color: form.model === m.id ? 'white' : '#0A2463' }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border"
                        style={{ background: form.model === m.id ? 'rgba(255,255,255,0.15)' : '#f1f5f9', borderColor: form.model === m.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0', fontFamily: "'Syne', sans-serif", color: form.model === m.id ? '#D4AF37' : '#475569' }}>
                        {m.id === 'MRL-L' ? 'L' : m.id === 'MRL-G' ? 'G' : m.id === 'HYD' ? 'HYD' : m.id === 'Home Lift' ? 'HL' : 'MR'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>{m.label}</p>
                        <p className="text-xs mt-0.5 opacity-60 leading-tight">{m.desc}</p>
                      </div>
                      {form.model === m.id && <CheckCircle2 size={18} className="shrink-0 text-[#D4AF37]" />}
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Parámetros */}
              <SectionCard title="Parámetros principales">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Capacidad" hint={`${CAPACITY_PERSONS[form.capacity] ?? '?'} personas`}>
                    <select className={sc('capacity')} value={form.capacity}
                      onChange={e => update({ capacity: Number(e.target.value) })}>
                      {CAPACITIES.map(c => <option key={c} value={c}>{c} kg — {CAPACITY_PERSONS[c] ?? '?'} pers.</option>)}
                    </select>
                  </Field>
                  <Field label="Paradas (niveles)">
                    <input type="number" min="2" max="60" className={ic('stops')}
                      value={form.stops} onChange={e => update({ stops: Number(e.target.value) })} />
                  </Field>
                  <Field label="Velocidad (m/s)">
                    <select className={sc('speed')} value={form.speed}
                      onChange={e => update({ speed: e.target.value })}>
                      {allowedSpeeds.map(s => <option key={s} value={s}>{s} m/s</option>)}
                    </select>
                  </Field>
                  <Field label="Cantidad de equipos">
                    <input type="number" min="1" max="20" className={ic('quantity')}
                      value={form.quantity} onChange={e => update({ quantity: Number(e.target.value) })} />
                  </Field>
                  {/* Ajuste 1: Tracción siempre Cable de Acero — solo informativo */}
                  <Field label="Tracción" hint="Automático">
                    <input className={INPUT_RO} value="Cable de Acero" readOnly
                      title="La especificación exacta se define en la guía mecánica" />
                  </Field>
                </div>
              </SectionCard>

              {/* Dimensiones */}
              <SectionCard title="Dimensiones de obra (mm)" note="Valores mínimos recomendados — alertas en rojo/amarillo">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Recorrido" hint={`≈ ${((form.travel||0)/1000).toFixed(1)} m`}>
                    <input type="number" className={ic('travel')} value={form.travel}
                      onChange={e => update({ travel: Number(e.target.value) })} />
                  </Field>
                  {!isMRL && !isHyd && (
                    <Field label="Fosa / Pit" hint="Mín. 1100mm">
                      <input type="number" className={ic('pit')} value={form.pit}
                        onChange={e => update({ pit: Number(e.target.value) })} />
                    </Field>
                  )}
                  {!isMRL && !isHyd && (
                    <Field label="Sobrepaso (OH)" hint="Mín. 3500mm">
                      <input type="number" className={ic('overhead')} value={form.overhead}
                        onChange={e => update({ overhead: Number(e.target.value) })} />
                    </Field>
                  )}
                  <Field label="Ancho de cubo">
                    <input type="number" className={ic('shaft_width')} value={form.shaft_width}
                      onChange={e => update({ shaft_width: Number(e.target.value) })} />
                  </Field>
                  <Field label="Fondo de cubo">
                    <input type="number" className={ic('shaft_depth')} value={form.shaft_depth}
                      onChange={e => update({ shaft_depth: Number(e.target.value) })} />
                  </Field>
                </div>
              </SectionCard>

              {/* Ajuste 4: Lado de apertura MRL-L */}
              {isMRL_L && (
                <SectionCard title="Configuración MRL-L — Muro de carga">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Lado de apertura" hint="Determina el tipo de puerta">
                      <select className={SELECT} value={form.door_side || 'Derecha'}
                        onChange={e => update({ door_side: e.target.value as any })}>
                        <option value="Derecha">Derecha</option>
                        <option value="Izquierda">Izquierda</option>
                      </select>
                    </Field>
                    <Field label="Tipo de puerta" hint="Auto según lado">
                      <select className={SELECT} value={form.door_type || doorTypeOptions[0]}
                        onChange={e => update({ door_type: e.target.value })}>
                        {doorTypeOptions.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                  </div>
                </SectionCard>
              )}

              {/* Puertas y cabina */}
              <SectionCard title="Puertas y acabados de cabina">
                <div className="grid grid-cols-2 gap-4">
                  {/* Ajuste 4: tipo de puerta solo si NO es MRL-L (para MRL-L ya está arriba) */}
                  {!isMRL_L && (
                    <Field label="Tipo de puertas">
                      <select className={SELECT} value={form.door_type || ''}
                        onChange={e => update({ door_type: e.target.value })}>
                        {doorTypeOptions.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                  )}
                  <div className={`grid grid-cols-2 gap-2 ${isMRL_L ? 'col-span-2' : ''}`}>
                    <Field label="Ancho paso (mm)">
                      <select className={SELECT} value={form.door_width}
                        onChange={e => update({ door_width: Number(e.target.value) })}>
                        {[700,800,900,1000,1100,1200].map(w => <option key={w}>{w}</option>)}
                      </select>
                    </Field>
                    <Field label="Alto paso (mm)">
                      <select className={SELECT} value={form.door_height}
                        onChange={e => update({ door_height: Number(e.target.value) })}>
                        {[2000,2100,2200,2300,2400].map(h => <option key={h}>{h}</option>)}
                      </select>
                    </Field>
                  </div>



                  {/* ── ACABADO DE PAREDES ── */}
                  <CatalogPicker
                    title="Acabado de paredes"
                    hint={form.use_type === 'Pasajeros' ? 'INOX Mate sugerido' : 'Epóxico sugerido'}
                    items={CABIN_WALLS.filter(w => w.use.includes(form.use_type || 'Pasajeros'))}
                    value={form.cabin_finish || ''}
                    matchBy="label"
                    onSelect={w => update({ cabin_finish: w.label })}
                    width={90} height={72}
                  />

                  {/* ── EXTRAS DE CABINA ── */}
                  <div className="col-span-2">
                    <label className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-[#0A2463]/70 uppercase tracking-wider">Extras de cabina</span>
                      <span className="text-[10px] text-[#0A2463]/40 italic">Selecciona los que apliquen</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CABIN_EXTRAS.filter(e => (e.use as readonly string[]).includes(form.use_type || 'Pasajeros')).map(extra => {
                        const currentExtras: string[] = (() => { try { return JSON.parse(form.cabin_model || '[]'); } catch { return []; } })();
                        const isSelected = currentExtras.includes(extra.id);
                        return (
                          <button key={extra.id} type="button"
                            onClick={() => {
                              const next = isSelected
                                ? currentExtras.filter((e: string) => e !== extra.id)
                                : [...currentExtras, extra.id];
                              update({ cabin_model: JSON.stringify(next) });
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                            style={{ borderColor: isSelected ? '#0A2463' : '#e2e8f0', background: isSelected ? '#0A2463' : 'white' }}>
                            <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                              style={{ borderColor: isSelected ? '#D4AF37' : '#cbd5e1', background: isSelected ? '#D4AF37' : 'transparent' }}>
                              {isSelected && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="#0A2463" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: isSelected ? 'white' : '#0A2463' }}>
                              {extra.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── PISO DE CABINA ── */}
                  <CatalogPicker
                    title="Piso de cabina"
                    hint={form.use_type === 'Pasajeros' ? 'Granitos importados' : 'Industrial'}
                    items={FLOOR_FINISHES.filter(f => f.use.includes(form.use_type || 'Pasajeros'))}
                    value={form.cabin_floor || ''}
                    matchBy="label"
                    onSelect={f => update({ cabin_floor: f.label })}
                    width={70} height={52}
                  />

                  <CatalogPicker
                    title="Plafón — Catálogo LV"
                    hint="Haz clic para ver diseño"
                    items={PLAFONOS}
                    value={form.cop_model || 'LV-29'}
                    matchBy="id"
                    onSelect={p => update({ cop_model: p.id })}
                    width={70} height={52}
                  />

                  {/* ── CONFIGURADOR VISUAL DE CABINA ── */}
                  <div className="col-span-2">
                    <label className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-[#0A2463]/70 uppercase tracking-wider">
                        Vista de cabina configurada
                      </span>
                      <span className="text-[10px] text-[#D4AF37]/70 italic">
                        {cabinImage ? '✓ Imagen capturada para el PDF' : 'Captura la imagen para incluirla en la propuesta'}
                      </span>
                    </label>
                    <CabinConfigurator
                      wallFinish={form.cabin_finish || ''}
                      wallImg={CABIN_WALLS.find(w => w.label === form.cabin_finish)?.img || ''}
                      floorLabel={form.cabin_floor || ''}
                      floorImg={FLOOR_FINISHES.find(f => f.label === form.cabin_floor)?.img || ''}
                      plafonId={form.cop_model || 'LV-29'}
                      plafonImg={PLAFONOS.find(p => p.id === form.cop_model)?.img || ''}
                      extras={(() => { try { return JSON.parse(form.cabin_model || '[]'); } catch { return []; } })()}
                      onCapture={img => setCabinImage(img)}
                    />
                    {cabinImage && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#065f46' }}>
                        <span className="font-bold">✓</span>
                        Imagen lista — se incluirá automáticamente en la página de cabina del PDF
                      </div>
                    )}
                  </div>

                  <Field label="Normativa aplicable">
                    <select className={SELECT} value={form.norm}
                      onChange={e => update({ norm: e.target.value })}>
                      <option value="EN 81-20">EN 81-20 (estándar)</option>
                      <option value="EN 81-1">EN 81-1</option>
                      <option value="ASME A17.1">ASME A17.1</option>
                      <option value="NOM-053">NOM-053</option>
                    </select>
                  </Field>
                </div>

                {/* Automáticos — solo informativo */}
                <div className="mt-4 p-4 rounded-xl bg-[#0A2463]/5 border border-[#0A2463]/10">
                  <p className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-widest mb-3">
                    Generado automáticamente
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#0A2463]/50 uppercase mb-1">Botoneras COP/LOP</p>
                      <p className="text-xs font-semibold text-[#0A2463]">Punto Matriz (estándar)</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#0A2463]/50 uppercase mb-1">Sistema de tracción</p>
                      <p className="text-xs font-semibold text-[#0A2463]">{autoTractionLabel(form.model, String(form.speed))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#0A2463]/50 uppercase mb-1">Rieles Cabina / Contrapeso</p>
                      <p className="text-xs font-semibold text-[#0A2463]">{autoRails(form.model).cabin} / {autoRails(form.model).counterweight}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#0A2463]/50 uppercase mb-1">Nomenclatura de pisos</p>
                      <p className="text-xs font-semibold text-[#0A2463] truncate">{generateFloorNomenclature(form.stops)}</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════ PASO 3 ════ */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <SectionCard title="Proveedor — uso interno, no aparece en PDF del cliente">
                <div className="grid grid-cols-2 gap-3">
                  {(['Turco','Chino'] as const).map(s => {
                    const isForced = s === 'Turco' && dimWarnings.length > 0;
                    return (
                      <button key={s} onClick={() => !isForced && update({ supplier: s })}
                        className="py-4 px-5 rounded-xl text-left transition-all border-2 relative"
                        style={{ background: form.supplier === s ? '#0A2463' : 'white', borderColor: form.supplier === s ? '#0A2463' : '#e2e8f0', color: form.supplier === s ? 'white' : '#0A2463' }}>
                        <p className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {s === 'Turco' ? '🇹🇷' : '🇨🇳'} Proveedor {s}
                        </p>
                        <p className="text-xs mt-0.5 opacity-60">
                          {s === 'Turco' ? 'Asansör — a medida y estándar' : 'Estándar — medidas de catálogo'}
                        </p>
                        {isForced && <span className="absolute top-2 right-2 text-[9px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">REQUERIDO</span>}
                      </button>
                    );
                  })}
                </div>
                {dimWarnings.length > 0 && (
                  <p className="text-xs text-orange-600 mt-3 flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={12} /> Dimensiones fuera de estándar — proveedor Turco obligatorio
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Precio de venta" icon={DollarSign}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Precio unitario (MXN sin IVA)">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#D4AF37] text-base">$</span>
                        <input type="number" min="0" step="1000"
                          className={INPUT + ' pl-8 text-lg font-black text-[#0A2463]'}
                          value={form.price || ''} onChange={e => update({ price: Number(e.target.value) })}
                          placeholder="0" />
                      </div>
                    </Field>
                  </div>
                  <Field label="Moneda">
                    <select className={SELECT} value={form.currency} onChange={e => update({ currency: e.target.value as any })}>
                      <option value="MXN">MXN — Peso Mexicano</option>
                      <option value="USD">USD — Dólar</option>
                    </select>
                  </Field>
                  {/* Ajuste 7: estado informativo — siempre se guarda como "Enviada" */}
                  <Field label="Estado al guardar">
                    <input className={INPUT_RO + ' text-blue-700 font-semibold'} value="Enviada (automático)" readOnly />
                  </Field>
                </div>

                {form.price > 0 && (
                  <div className="mt-5 p-5 rounded-xl flex items-center justify-between"
                    style={{ background: '#0A2463' }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1">
                        Total — {form.quantity} equipo{form.quantity > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-white/40">Con IVA: {fmt.format(total * 1.16)}</p>
                    </div>
                    <p className="font-black text-3xl text-[#D4AF37]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {fmt.format(total)}
                    </p>
                  </div>
                )}
              </SectionCard>

              {/* Condiciones comerciales editables */}
              <SectionCard title="Condiciones comerciales" note="Aparece en el PDF del cliente">
                <div className="space-y-3">
                  <Field label="Tiempo de entrega">
                    <input className={INPUT} value={form.commercial_terms?.deliveryTime || ''}
                      onChange={e => update({ commercial_terms: { ...form.commercial_terms!, deliveryTime: e.target.value } })}
                      placeholder="6 meses a partir de firma de contrato y anticipo" />
                  </Field>
                  <Field label="Garantía">
                    <input className={INPUT} value={form.commercial_terms?.warranty || ''}
                      onChange={e => update({ commercial_terms: { ...form.commercial_terms!, warranty: e.target.value } })}
                      placeholder="3 años a partir de la entrega del equipo" />
                  </Field>
                  <Field label="Formas de pago (equipo)">
                    <textarea rows={2} className={INPUT + ' resize-none text-xs'}
                      value={form.commercial_terms?.paymentMethod || ''}
                      onChange={e => update({ commercial_terms: { ...form.commercial_terms!, paymentMethod: e.target.value } })}
                      placeholder="50% Anticipo / 25% Embarque / 20% Entrega / 05% Puesta en marcha" />
                  </Field>
                  <Field label="Validez de la propuesta">
                    <input className={INPUT} value={form.commercial_terms?.validity || ''}
                      onChange={e => update({ commercial_terms: { ...form.commercial_terms!, validity: e.target.value } })}
                      placeholder="15 días naturales" />
                  </Field>
                  <Field label="Condiciones generales adicionales">
                    <textarea rows={2} className={INPUT + ' resize-none text-xs'}
                      value={form.commercial_terms?.generalConditions || ''}
                      onChange={e => update({ commercial_terms: { ...form.commercial_terms!, generalConditions: e.target.value } })}
                      placeholder="Obra civil por cuenta del cliente." />
                  </Field>
                </div>
              </SectionCard>

              {/* Opciones del PDF */}
              <PDFOptionsSection value={pdfOptions} onChange={setPdfOptions} />

              {/* Ajuste 8: notas internas conservadas */}
              <SectionCard title="Notas internas" note="No aparece en el PDF del cliente">
                <textarea rows={2} className={INPUT + ' resize-none'}
                  value={form.internal_notes || ''} onChange={e => update({ internal_notes: e.target.value })}
                  placeholder="Contexto de la venta, acuerdos verbales, observaciones..." />
              </SectionCard>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* NAV INFERIOR */}
      <div className="relative z-10 px-6 py-4 shrink-0 flex items-center justify-between bg-white/60 backdrop-blur-md border-t border-[#D4AF37]/20">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : onCancel()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#0A2463]/60 hover:text-[#0A2463] hover:bg-[#0A2463]/5 transition-all">
          <ArrowLeft size={16} />
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              className="rounded-full transition-all duration-300"
              style={{ width: step === s.id ? 24 : 8, height: 8, background: step === s.id ? '#0A2463' : step > s.id ? '#D4AF37' : '#cbd5e1' }} />
          ))}
        </div>

        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
            Siguiente <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving || errors.length > 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: errors.length > 0 ? '#94a3b8' : '#0A2463', fontFamily: "'Syne', sans-serif" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            {saving ? 'Guardando...' : 'Guardar y ver PDF'}
          </button>
        )}
      </div>
    </div>
    </>
  );
}
