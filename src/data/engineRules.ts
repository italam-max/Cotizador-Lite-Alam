// ARCHIVO: src/data/engineRules.ts
// Motor de reglas de ingeniería — elimina el error humano
// Basado en: fichas técnicas Alamex, norma EN 81-20, TECHNICAL_RULES del original

import type { ModelId, UseType, DoorSide, Quote } from '../types';

// ─── TABLAS BASE ─────────────────────────────────────────────

export const CAPACITY_PERSONS: Record<number, number> = {
  320: 4, 400: 5, 450: 6, 630: 8, 800: 10,
  1000: 13, 1250: 16, 1600: 21, 2000: 26, 2500: 33, 3000: 40, 4000: 53, 5000: 66,
};

export const CAPACITIES = Object.keys(CAPACITY_PERSONS).map(Number);

export const SPEEDS = ['0.6', '1.0', '1.6', '1.75', '2.0', '2.5', '3.0', '4.0'];

export const MODELS: { id: ModelId; label: string; desc: string }[] = [
  { id: 'MRL-L', label: 'MRL-L',     desc: 'Sin cuarto de máquinas — Chasis L (hasta 450 kg, 8 paradas)' },
  { id: 'MRL-G', label: 'MRL-G',     desc: 'Sin cuarto de máquinas — Chasis G (hasta 1000 kg, 8 paradas)' },
  { id: 'MR',    label: 'MR',        desc: 'Con cuarto de máquinas (alta carga, muchos niveles)' },
  { id: 'HYD',   label: 'Hidráulico',desc: 'Hidráulico (máx. 12m recorrido, 3 paradas, 0.6 m/s)' },
  { id: 'Home Lift', label: 'Home Lift', desc: 'Residencial (homelift hidráulico o gearless)' },
];

// Reglas de cubo mínimo por capacidad
export const SHAFT_RULES: { minKg: number; maxKg: number; model: ModelId; minWidth: number; minDepth: number; maxSpeed: number }[] = [
  { minKg: 0,    maxKg: 450,  model: 'MRL-L', minWidth: 1550, minDepth: 1550, maxSpeed: 1.0  },
  { minKg: 451,  maxKg: 630,  model: 'MRL-G', minWidth: 1600, minDepth: 1650, maxSpeed: 1.6  },
  { minKg: 631,  maxKg: 800,  model: 'MRL-G', minWidth: 1750, minDepth: 1750, maxSpeed: 1.75 },
  { minKg: 801,  maxKg: 1000, model: 'MRL-G', minWidth: 1800, minDepth: 2000, maxSpeed: 2.0  },
  { minKg: 1001, maxKg: 1275, model: 'MR',    minWidth: 2000, minDepth: 2400, maxSpeed: 2.5  },
  { minKg: 1276, maxKg: 1600, model: 'MR',    minWidth: 2355, minDepth: 2730, maxSpeed: 2.5  },
  { minKg: 1601, maxKg: 2000, model: 'MR',    minWidth: 2555, minDepth: 2800, maxSpeed: 2.5  },
  { minKg: 2001, maxKg: 5000, model: 'MR',    minWidth: 2800, minDepth: 3000, maxSpeed: 2.5  },
];

// Fosa y huida estándar por velocidad y modelo
const DIM_TABLE: { speed: number; model: ModelId; pit: number; overhead: number }[] = [
  { speed: 0.6,  model: 'HYD',   pit: 1100, overhead: 3400 },
  { speed: 1.0,  model: 'MRL-G', pit: 1100, overhead: 3900 },
  { speed: 1.0,  model: 'MRL-L', pit: 1100, overhead: 3600 },
  { speed: 1.0,  model: 'MR',    pit: 1100, overhead: 3500 },
  { speed: 1.6,  model: 'MRL-G', pit: 1300, overhead: 3800 },
  { speed: 1.6,  model: 'MR',    pit: 1400, overhead: 4000 },
  { speed: 1.75, model: 'MRL-G', pit: 1400, overhead: 4100 },
  { speed: 2.0,  model: 'MRL-G', pit: 1500, overhead: 4300 },
  { speed: 2.0,  model: 'MR',    pit: 1650, overhead: 4500 },
  { speed: 2.5,  model: 'MRL-G', pit: 2000, overhead: 4800 },
  { speed: 2.5,  model: 'MR',    pit: 2000, overhead: 4750 },
  { speed: 3.0,  model: 'MR',    pit: 2200, overhead: 5000 },
  { speed: 4.0,  model: 'MR',    pit: 2500, overhead: 5500 },
];

// ─── HELPERS ────────────────────────────────────────────────

export const getDims = (speed: number, model: ModelId) => {
  const exact = DIM_TABLE.find(r => r.speed === speed && r.model === model);
  if (exact) return { pit: exact.pit, overhead: exact.overhead };
  // Fallback: buscar más cercano hacia arriba del mismo modelo
  const fallback = DIM_TABLE.filter(r => r.model === model && r.speed >= speed)
    .sort((a, b) => a.speed - b.speed)[0];
  return fallback ? { pit: fallback.pit, overhead: fallback.overhead } : { pit: 1300, overhead: 3900 };
};

export const getShaftRule = (capacity: number) =>
  SHAFT_RULES.find(r => capacity >= r.minKg && capacity <= r.maxKg);

/** Velocidad mínima recomendada por EN 81 según número de paradas */
export const minSpeedForStops = (stops: number): number => {
  if (stops > 30) return 2.5;
  if (stops > 20) return 2.0;
  if (stops > 15) return 1.75;
  if (stops > 10) return 1.6;
  if (stops > 6)  return 1.0;
  return 0.6;
};

/** Modelo sugerido automáticamente según los parámetros */
export const suggestModel = (capacity: number, stops: number, travel: number): ModelId => {
  const HYD_MAX_TRAVEL = 12000;
  const HYD_MAX_STOPS  = 3;
  if (travel <= HYD_MAX_TRAVEL && stops <= HYD_MAX_STOPS && capacity <= 1000) return 'HYD';
  if (stops > 8 || capacity > 1000) return 'MR';
  if (capacity <= 450) return 'MRL-L';
  return 'MRL-G';
};

/** Tracción automática por modelo */
export const autoTraction = (model: ModelId): string => ({
  'MRL-G':     'Bandas Planas (STM)',
  'MRL-L':     'Cable de Acero',
  'MR':        'Cable de Acero',
  'HYD':       'Impulsión Hidráulica',
  'Home Lift': 'Impulsión Hidráulica',
})[model] ?? 'Cable de Acero';

/** Control de grupo automático */
export const autoControlGroup = (qty: number): string => {
  if (qty === 1) return 'Simplex';
  if (qty === 2) return 'Duplex';
  if (qty === 3) return 'Triplex';
  if (qty === 4) return 'Cuadruplex';
  return `Grupo ${qty}`;
};

// ─── SMART DEFAULTS ──────────────────────────────────────────
/**
 * Dado el estado actual del formulario, calcula y devuelve
 * todos los valores que deben actualizarse automáticamente.
 * El vendedor no puede olvidar nada — el motor lo rellena.
 */
export const computeDefaults = (current: Partial<Omit<Quote, 'id'|'created'|'updated'|'collectionId'|'collectionName'>>): Partial<typeof current> => {
  const out: Partial<typeof current> = {};
  const stops    = current.stops    ?? 6;
  const capacity = current.capacity ?? 630;
  const qty      = current.quantity ?? 1;
  const travel   = current.travel   ?? (stops - 1) * 3000;

  // 1. Recorrido
  if (!current.travel) out.travel = (stops - 1) * 3000;

  // 2. Personas
  out.persons = CAPACITY_PERSONS[capacity] ?? 8;

  // 3. Modelo — correcciones automáticas
  let model = current.model as ModelId | undefined;
  if (!model) { model = suggestModel(capacity, stops, travel); out.model = model; }
  if (model === 'MRL-L' && capacity > 450)   { model = 'MRL-G'; out.model = model; }
  if (model === 'MRL-L' && stops > 8)         { model = 'MR';    out.model = model; }
  if ((model === 'MRL-G'||model==='MRL-L') && capacity > 1000) { model = 'MR'; out.model = model; }
  if ((model === 'MRL-G'||model==='MRL-L') && stops > 8) { model = 'MR'; out.model = model; }
  if ((model === 'HYD'||model==='Home Lift') && (travel > 12000 || stops > 3)) { model = 'MRL-G'; out.model = model; }

  // 4. Velocidad
  const shaftRule = getShaftRule(capacity);
  const isHyd = model === 'HYD' || model === 'Home Lift';
  const maxSpeed = isHyd ? 0.6 : (shaftRule?.maxSpeed ?? 1.0);
  const minSpeed = isHyd ? 0.6 : minSpeedForStops(stops);
  const currSpeed = parseFloat(String(current.speed ?? '0'));
  if (!current.speed || currSpeed < minSpeed || currSpeed > maxSpeed) {
    const best = SPEEDS.map(parseFloat).filter(v => v >= minSpeed && v <= maxSpeed).sort((a, b) => a - b)[0];
    out.speed = String(best ?? maxSpeed);
  }

  // 5. Fosa y huida
  const spd = parseFloat(String(out.speed ?? current.speed ?? 1.0));
  if (isHyd) {
    out.pit      = 1100;
    out.overhead = 3400;
  } else {
    const dims = getDims(spd, model);
    out.pit      = dims.pit;
    out.overhead = dims.overhead;
  }

  // 6. Cubo mínimo
  if (shaftRule && !isHyd) {
    if (!current.shaft_width  || current.shaft_width  < shaftRule.minWidth)  out.shaft_width  = shaftRule.minWidth;
    if (!current.shaft_depth  || current.shaft_depth  < shaftRule.minDepth)  out.shaft_depth  = shaftRule.minDepth;
  }

  // 7. Tracción y control de grupo
  out.traction      = autoTraction(model);
  out.control_group = autoControlGroup(qty);

  // 8. Lado de apertura
  if (model === 'MRL-L' && (!current.door_side || current.door_side === 'N/A')) {
    out.door_side = 'Derecha';
  } else if (model !== 'MRL-L') {
    out.door_side = 'N/A';
  }

  // 9. Cabina según uso
  if (current.use_type === 'Carga' && current.cabin_model !== 'ACC') {
    out.cabin_model  = 'ACC';
    out.cabin_finish = 'Pintura Epóxica Industrial';
  }

  return out;
};

// ─── VALIDACIÓN ──────────────────────────────────────────────
export interface ValidationResult {
  errors:   { field: string; msg: string }[];
  warnings: { field: string; msg: string }[];
  isValid:  boolean;
}

export const validate = (q: Partial<Omit<Quote, keyof import('../services/pb').PBRecord>>): ValidationResult => {
  const errors:   { field: string; msg: string }[] = [];
  const warnings: { field: string; msg: string }[] = [];

  const model    = String(q.model ?? '');
  const capacity = q.capacity ?? 0;
  const stops    = q.stops    ?? 0;
  const travel   = q.travel   ?? 0;
  const speed    = parseFloat(String(q.speed ?? '0'));
  const isHyd    = model === 'HYD' || model === 'Home Lift';
  const isMRL    = model.includes('MRL');

  const err  = (field: string, msg: string) => errors.push({ field, msg });
  const warn = (field: string, msg: string) => warnings.push({ field, msg });

  // Datos obligatorios del cliente
  if (!q.client_name?.trim()) err('client_name', 'Nombre del cliente requerido');
  if (!q.price || q.price <= 0) warn('price', 'Falta el precio — ve al paso Comercial');

  // Reglas de modelo
  if (model === 'MRL-L') {
    if (capacity > 450)  err('capacity', `MRL-L: máx. 450 kg. Actual: ${capacity} kg`);
    if (stops > 8)       err('stops',    `MRL-L: máx. 8 paradas. Actual: ${stops}`);
    if (!q.door_side || q.door_side === 'N/A')
      warn('door_side', 'MRL-L requiere especificar lado de apertura (muro de carga)');
  }
  if (model === 'MRL-G') {
    if (capacity > 1000) err('capacity', `MRL-G: máx. 1000 kg. Actual: ${capacity} kg`);
    if (stops > 8)       err('stops',    `MRL-G: máx. 8 paradas recomendado. Actual: ${stops}`);
  }
  if (isHyd) {
    if (travel > 12000)  err('travel', `Hidráulico: máx. 12 m. Actual: ${(travel/1000).toFixed(1)} m`);
    if (stops > 3)       err('stops',  `Hidráulico: máx. 3 paradas. Actual: ${stops}`);
    if (speed > 0.63)    err('speed',  `Hidráulico: máx. 0.6 m/s. Actual: ${speed} m/s`);
  }

  // Velocidad
  const minSpd = isHyd ? 0.6 : minSpeedForStops(stops);
  const shRule = getShaftRule(capacity);
  const maxSpd = isHyd ? 0.6 : (shRule?.maxSpeed ?? 1.0);
  if (speed < minSpd) err('speed', `Mín. ${minSpd} m/s para ${stops} paradas. Actual: ${speed} m/s`);
  if (speed > maxSpd) err('speed', `Máx. ${maxSpd} m/s para ${capacity} kg. Actual: ${speed} m/s`);

  // Cubo
  if (shRule && !isHyd) {
    if ((q.shaft_width ?? 0) < shRule.minWidth)
      warn('shaft_width', `Cubo estrecho. Mín: ${shRule.minWidth} mm para ${capacity} kg`);
    if ((q.shaft_depth ?? 0) < shRule.minDepth)
      warn('shaft_depth', `Cubo corto. Mín: ${shRule.minDepth} mm para ${capacity} kg`);
  }

  // Fosa/Huida
  if (!isMRL && !isHyd) {
    const dims = getDims(speed, model as ModelId);
    if ((q.pit ?? 0) < dims.pit * 0.9)
      warn('pit', `Fosa recomendada: ${dims.pit} mm para ${speed} m/s`);
    if ((q.overhead ?? 0) < dims.overhead * 0.9)
      warn('overhead', `Huida recomendada: ${dims.overhead} mm para ${speed} m/s`);
  }

  // MRL-G en >10 niveles
  if (model === 'MRL-G' && stops > 10)
    warn('stops', `Para ${stops} niveles, MR ofrece mayor confort sísmico`);

  return { errors, warnings, isValid: errors.length === 0 };
};

// ─── OPCIONES PERMITIDAS ────────────────────────────────────
export const getAllowedModels = (capacity: number, stops: number, travel: number) =>
  MODELS.filter(m => {
    const id = m.id;
    if ((id === 'HYD'||id==='Home Lift') && (travel > 12000 || stops > 3)) return false;
    if (id === 'MRL-L' && (capacity > 450 || stops > 8)) return false;
    if ((id === 'MRL-G'||id==='MRL-L') && (capacity > 1000 || stops > 8)) return false;
    return true;
  });

export const getAllowedSpeeds = (model: ModelId, capacity: number, stops: number): string[] => {
  const isHyd = model === 'HYD' || model === 'Home Lift';
  const shRule = getShaftRule(capacity);
  const maxSpd = isHyd ? 0.6 : (shRule?.maxSpeed ?? 2.5);
  const minSpd = isHyd ? 0.6 : minSpeedForStops(stops);
  const valid = SPEEDS.filter(s => { const v = parseFloat(s); return v >= minSpd && v <= maxSpd; });
  return valid.length > 0 ? valid : [String(maxSpd)];
};
