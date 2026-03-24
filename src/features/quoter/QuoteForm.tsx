// ARCHIVO: src/features/quoter/QuoteForm.tsx
// Wizard inteligente de 3 pasos — elimina el error humano en cotización
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, Save, Eye, Loader2,
  User, Settings2, DollarSign, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import { QuotesService, nextFolio } from '../../services/quotesService';
import { computeDefaults, getAllowedModels, getAllowedSpeeds, validate, CAPACITIES, CAPACITY_PERSONS } from '../../data/engineRules';
import type { Quote, UserRecord } from '../../types';
import { EMPTY_QUOTE } from '../../types';

interface Props {
  quote:    Quote | null;
  user:     UserRecord;
  onSaved:  () => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: 'Cliente',       icon: User      },
  { id: 2, label: 'Técnico',       icon: Settings2 },
  { id: 3, label: 'Comercial',     icon: DollarSign},
];

type FormData = Omit<Quote, 'id'|'created'|'updated'|'collectionId'|'collectionName'>;

export default function QuoteForm({ quote, user, onSaved, onCancel }: Props) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState<FormData>(() => quote ? { ...EMPTY_QUOTE, ...quote } : { ...EMPTY_QUOTE, owner_id: user.id });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<{ field: string; msg: string }[]>([]);
  const [warnings, setWarnings] = useState<{ field: string; msg: string }[]>([]);

  // Generar folio si es nuevo
  useEffect(() => {
    if (!quote && !form.folio) {
      nextFolio().then(f => setForm(p => ({ ...p, folio: f })));
    }
  }, []);

  // Auto-calcular defaults cuando cambian parámetros clave
  const update = useCallback((fields: Partial<FormData>) => {
    setForm(prev => {
      const next = { ...prev, ...fields };
      // Si cambió algo técnico, recalcular
      const techKeys = ['capacity','stops','speed','model','quantity','use_type'] as const;
      const hasTechChange = techKeys.some(k => k in fields);
      if (hasTechChange) {
        const defaults = computeDefaults(next);
        // No sobrescribir lo que el usuario acaba de cambiar explícitamente
        const safe = { ...defaults };
        Object.keys(fields).forEach(k => { delete (safe as any)[k]; });
        return { ...next, ...safe };
      }
      return next;
    });
  }, []);

  // Validación en tiempo real
  useEffect(() => {
    const { errors: e, warnings: w } = validate(form);
    setErrors(e);
    setWarnings(w);
  }, [form]);

  const hasError = (field: string) => errors.some(e => e.field === field);
  const hasWarn  = (field: string) => warnings.some(w => w.field === field);
  const fieldClass = (field: string) =>
    `input-base ${hasError(field) ? 'input-error' : hasWarn(field) ? '!border-yellow-500/50' : ''}`;

  const allowedModels = getAllowedModels(form.capacity, form.stops, form.travel || (form.stops-1)*3000);
  const allowedSpeeds = getAllowedSpeeds(form.model, form.capacity, form.stops);

  const handleSave = async () => {
    if (errors.length > 0) { setStep(2); return; }
    setSaving(true);
    try {
      if (quote?.id) {
        await QuotesService.update(quote.id, form as any);
      } else {
        await QuotesService.create(form);
      }
      onSaved();
    } catch (e: any) {
      alert('Error al guardar: ' + (e?.message ?? 'Error desconocido'));
    } finally { setSaving(false); }
  };

  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const total = (form.price || 0) * (form.quantity || 1);
  const isMRL  = form.model.includes('MRL');
  const isHyd  = form.model === 'HYD' || form.model === 'Home Lift';

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">

      {/* ── Header ── */}
      <div className="px-8 py-5 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="btn-ghost !px-3 !py-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {quote ? `Editando ${form.folio}` : 'Nueva cotización'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {form.client_name || 'Sin cliente'} · {form.model} · {form.capacity} kg · {form.stops} paradas
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done   = step > s.id;
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? 'var(--gold-500)' : 'transparent',
                  color: active ? 'var(--navy-900)' : done ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: active ? "'Syne', sans-serif" : 'inherit',
                  fontWeight: active ? 700 : 400,
                }}>
                {done ? <CheckCircle2 size={13} /> : <s.icon size={13} />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          {errors.length === 0 && (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {quote ? 'Guardar cambios' : 'Crear cotización'}
            </button>
          )}
          {errors.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <AlertTriangle size={14} />
              {errors.length} error{errors.length > 1 ? 'es' : ''} — revisa Paso 2
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Form panel */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">

            {/* ════ PASO 1: CLIENTE ════ */}
            {step === 1 && (<>
              <Section title="Información del cliente">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nombre / Empresa *" span={2}>
                    <input className={fieldClass('client_name')} value={form.client_name}
                      onChange={e => update({ client_name: e.target.value })}
                      placeholder="Constructora XYZ S.A." />
                  </Field>
                  <Field label="Correo electrónico">
                    <input type="email" className={fieldClass('client_email')} value={form.client_email}
                      onChange={e => update({ client_email: e.target.value })}
                      placeholder="contacto@empresa.com" />
                  </Field>
                  <Field label="Teléfono">
                    <input className={fieldClass('client_phone')} value={form.client_phone}
                      onChange={e => update({ client_phone: e.target.value })}
                      placeholder="+52 55 0000 0000" />
                  </Field>
                  <Field label="Folio">
                    <input className="input-base" value={form.folio} readOnly
                      style={{ color: 'var(--gold-400)', fontFamily: "'Syne', sans-serif", fontWeight: 600 }} />
                  </Field>
                  <Field label="Fecha de cotización">
                    <input type="date" className="input-base" value={form.project_date}
                      onChange={e => update({ project_date: e.target.value })} />
                  </Field>
                </div>
              </Section>

              <Section title="Tipo de proyecto">
                <div className="grid grid-cols-3 gap-3">
                  {(['Pasajeros','Carga','Montaplatos'] as const).map(t => (
                    <button key={t} onClick={() => update({ use_type: t })}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-all text-left"
                      style={{
                        background: form.use_type === t ? 'rgba(212,175,55,0.15)' : 'var(--surface-1)',
                        border: `1px solid ${form.use_type === t ? 'rgba(212,175,55,0.5)' : 'var(--border)'}`,
                        color: form.use_type === t ? 'var(--gold-400)' : 'var(--text-secondary)',
                      }}>
                      <div className="font-semibold">{t}</div>
                      <div className="text-xs mt-0.5 opacity-70">
                        {t === 'Pasajeros' ? 'Cabina estándar' : t === 'Carga' ? 'Cabina reforzada (ACC)' : 'Uso servicios'}
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            </>)}

            {/* ════ PASO 2: TÉCNICO ════ */}
            {step === 2 && (<>
              {/* Modelo — tarjetas visuales */}
              <Section title="Modelo de equipo">
                <div className="space-y-2">
                  {allowedModels.map(m => {
                    const active = form.model === m.id;
                    return (
                      <button key={m.id} onClick={() => update({ model: m.id })}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all"
                        style={{
                          background: active ? 'rgba(212,175,55,0.12)' : 'var(--surface-1)',
                          border: `1px solid ${active ? 'rgba(212,175,55,0.4)' : 'var(--border)'}`,
                        }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-display font-black text-sm"
                          style={{ background: active ? 'rgba(212,175,55,0.2)' : 'var(--surface-2)', color: active ? 'var(--gold-400)' : 'var(--text-muted)' }}>
                          {m.id === 'MR' ? 'MR' : m.id === 'MRL-L' ? 'L' : m.id === 'MRL-G' ? 'G' : m.id === 'HYD' ? 'HYD' : 'HL'}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: active ? 'var(--gold-400)' : 'var(--text-primary)' }}>{m.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.desc}</p>
                        </div>
                        {active && <CheckCircle2 size={18} style={{ color: 'var(--gold-500)', shrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Parámetros principales */}
              <Section title="Parámetros principales">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Capacidad (kg)" hint={`${CAPACITY_PERSONS[form.capacity] ?? '?'} personas`}>
                    <select className={`${fieldClass('capacity')} font-semibold`}
                      value={form.capacity} onChange={e => update({ capacity: Number(e.target.value) })}>
                      {CAPACITIES.map(c => (
                        <option key={c} value={c}>{c} kg — {CAPACITY_PERSONS[c] ?? '?'} pers.</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Paradas" hint="Niveles totales">
                    <input type="number" min="2" max="60" className={fieldClass('stops')}
                      value={form.stops} onChange={e => update({ stops: Number(e.target.value) })} />
                  </Field>
                  <Field label="Velocidad (m/s)">
                    <select className={fieldClass('speed')} value={form.speed}
                      onChange={e => update({ speed: e.target.value })}>
                      {allowedSpeeds.map(s => <option key={s} value={s}>{s} m/s</option>)}
                    </select>
                  </Field>
                  <Field label="Cantidad de equipos">
                    <input type="number" min="1" max="20" className="input-base"
                      value={form.quantity} onChange={e => update({ quantity: Number(e.target.value) })} />
                  </Field>
                  <Field label="Control de grupo">
                    <input className="input-base" value={form.control_group} readOnly
                      style={{ color: 'var(--text-secondary)' }} />
                  </Field>
                  <Field label="Tracción">
                    <input className="input-base" value={form.traction} readOnly
                      style={{ color: 'var(--text-secondary)' }} />
                  </Field>
                </div>
              </Section>

              {/* Dimensiones */}
              <Section title="Dimensiones de obra (mm)">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Recorrido (mm)" hint={`≈ ${((form.travel||0)/1000).toFixed(1)} m`}>
                    <input type="number" className={fieldClass('travel')} value={form.travel}
                      onChange={e => update({ travel: Number(e.target.value) })} />
                  </Field>
                  {!isMRL && !isHyd && (
                    <Field label="Fosa / Pit (mm)">
                      <input type="number" className={fieldClass('pit')} value={form.pit}
                        onChange={e => update({ pit: Number(e.target.value) })} />
                    </Field>
                  )}
                  {!isMRL && !isHyd && (
                    <Field label="Sobrepaso (mm)">
                      <input type="number" className={fieldClass('overhead')} value={form.overhead}
                        onChange={e => update({ overhead: Number(e.target.value) })} />
                    </Field>
                  )}
                  <Field label="Ancho de cubo (mm)">
                    <input type="number" className={fieldClass('shaft_width')} value={form.shaft_width}
                      onChange={e => update({ shaft_width: Number(e.target.value) })} />
                  </Field>
                  <Field label="Fondo de cubo (mm)">
                    <input type="number" className={fieldClass('shaft_depth')} value={form.shaft_depth}
                      onChange={e => update({ shaft_depth: Number(e.target.value) })} />
                  </Field>
                </div>
              </Section>

              {/* MRL-L: lado de apertura */}
              {form.model === 'MRL-L' && (
                <Section title="Configuración MRL-L">
                  <Field label="Lado de apertura (muro de carga)" hint="Depende de las condiciones de obra">
                    <select className={fieldClass('door_side')} value={form.door_side}
                      onChange={e => update({ door_side: e.target.value as any })}>
                      <option value="Derecha">Derecha</option>
                      <option value="Izquierda">Izquierda</option>
                    </select>
                  </Field>
                </Section>
              )}

              {/* Acabados */}
              <Section title="Puertas y cabina">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo de puertas">
                    <select className="input-base" value={form.door_type}
                      onChange={e => update({ door_type: e.target.value })}>
                      {['Automática Central','Telescópica Lateral','Manual Batiente'].map(d =>
                        <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Ancho paso (mm)">
                      <select className="input-base" value={form.door_width}
                        onChange={e => update({ door_width: Number(e.target.value) })}>
                        {[700,800,900,1000,1100,1200].map(w => <option key={w}>{w}</option>)}
                      </select>
                    </Field>
                    <Field label="Alto paso (mm)">
                      <select className="input-base" value={form.door_height}
                        onChange={e => update({ door_height: Number(e.target.value) })}>
                        {[2000,2100,2200,2300,2400].map(h => <option key={h}>{h}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Acabado de cabina">
                    <input className="input-base" value={form.cabin_finish}
                      onChange={e => update({ cabin_finish: e.target.value })}
                      placeholder="Inox Satinado 304" />
                  </Field>
                  <Field label="Piso de cabina">
                    <input className="input-base" value={form.cabin_floor}
                      onChange={e => update({ cabin_floor: e.target.value })}
                      placeholder="Granito Negro" />
                  </Field>
                  <Field label="Botoneras (COP/LOP)">
                    <input className="input-base" value={form.cop_model}
                      onChange={e => update({ cop_model: e.target.value })}
                      placeholder="Display Inteligente" />
                  </Field>
                  <Field label="Normativa">
                    <select className="input-base" value={form.norm}
                      onChange={e => update({ norm: e.target.value })}>
                      {['EN 81-20','EN 81-1','ASME A17.1','NOM-053'].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>
            </>)}

            {/* ════ PASO 3: COMERCIAL ════ */}
            {step === 3 && (<>
              <Section title="Proveedor (uso interno — no aparece en el PDF del cliente)">
                <div className="grid grid-cols-2 gap-3">
                  {(['Turco','Chino'] as const).map(s => (
                    <button key={s} onClick={() => update({ supplier: s })}
                      className="py-4 px-5 rounded-xl text-left transition-all"
                      style={{
                        background: form.supplier === s ? 'rgba(212,175,55,0.12)' : 'var(--surface-1)',
                        border: `1px solid ${form.supplier === s ? 'rgba(212,175,55,0.4)' : 'var(--border)'}`,
                      }}>
                      <p className="font-semibold text-sm mb-0.5" style={{ color: form.supplier === s ? 'var(--gold-400)' : 'var(--text-primary)' }}>
                        {s === 'Turco' ? '🇹🇷' : '🇨🇳'} Proveedor {s}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {s === 'Turco' ? 'Asansör — tiempos de entrega cortos' : 'Fabricación — precio competitivo'}
                      </p>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Precio">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Precio unitario (MXN sin IVA)" span={2}>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                        style={{ color: 'var(--gold-500)' }}>$</span>
                      <input type="number" min="0" step="1000"
                        className={`${fieldClass('price')} pl-8 text-lg font-semibold`}
                        style={{ color: 'var(--gold-400)' }}
                        value={form.price || ''}
                        onChange={e => update({ price: Number(e.target.value) })}
                        placeholder="0" />
                    </div>
                  </Field>
                  <Field label="Moneda">
                    <select className="input-base" value={form.currency}
                      onChange={e => update({ currency: e.target.value as any })}>
                      <option value="MXN">MXN — Peso Mexicano</option>
                      <option value="USD">USD — Dólar</option>
                    </select>
                  </Field>
                  <Field label="Estado inicial">
                    <select className="input-base" value={form.status}
                      onChange={e => update({ status: e.target.value as any })}>
                      {['Borrador','Enviada','En Negociación','Ganada','Perdida','Cancelada'].map(s =>
                        <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Resumen precio */}
                {form.price > 0 && (
                  <div className="mt-4 p-5 rounded-2xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--gold-500)' }}>Total {form.quantity} equipo{form.quantity > 1 ? 's' : ''}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Con IVA: {fmt.format(total * 1.16)}</p>
                      </div>
                      <p className="font-display font-bold text-3xl" style={{ color: 'var(--gold-400)' }}>{fmt.format(total)}</p>
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Notas internas">
                <textarea rows={4} className="input-base resize-none"
                  value={form.internal_notes}
                  onChange={e => update({ internal_notes: e.target.value })}
                  placeholder="Contexto de la venta, acuerdos verbales, próximos pasos..." />
              </Section>
            </>)}

          </div>
        </div>

        {/* ── Panel derecho: Live Monitor ── */}
        <div className="w-[300px] shrink-0 border-l flex flex-col p-5 gap-4 overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'rgba(10,22,40,0.5)' }}>

          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Monitor de ingeniería
          </p>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Modelo',    value: form.model },
              { label: 'Capacidad', value: `${form.capacity} kg` },
              { label: 'Velocidad', value: `${form.speed} m/s` },
              { label: 'Paradas',   value: form.stops },
              { label: 'Personas',  value: form.persons },
              { label: 'Recorrido', value: `${((form.travel||0)/1000).toFixed(1)} m` },
            ].map(k => (
              <div key={k.label} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
                <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Errores */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fca5a5' }}>Errores críticos</p>
              {errors.map((e, i) => (
                <div key={i} className="flex gap-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {e.msg}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fde047' }}>Advertencias</p>
              {warnings.map((w, i) => (
                <div key={i} className="flex gap-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#fde047' }}>
                  <Info size={13} className="shrink-0 mt-0.5" />
                  {w.msg}
                </div>
              ))}
            </div>
          )}

          {errors.length === 0 && warnings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 size={28} style={{ color: '#86efac' }} />
              <p className="text-xs" style={{ color: '#86efac' }}>Configuración óptima</p>
            </div>
          )}

          {/* Nav steps */}
          <div className="mt-auto flex justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}
              className="btn-ghost !px-3 !py-2 disabled:opacity-30">
              <ArrowLeft size={15} />
            </button>
            <div className="flex gap-1.5 items-center">
              {STEPS.map(s => (
                <div key={s.id} className="rounded-full transition-all"
                  style={{ width: step === s.id ? 20 : 6, height: 6, background: step === s.id ? 'var(--gold-500)' : 'var(--surface-3)' }} />
              ))}
            </div>
            <button onClick={() => step < 3 ? setStep(s => s+1) : handleSave()}
              disabled={saving} className="btn-primary !px-3 !py-2">
              {step < 3 ? <ArrowRight size={15} /> : saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 glass-2">
      <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--gold-500)' }}>{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, span, children }: { label: string; hint?: string; span?: number; children: React.ReactNode }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        {hint && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
