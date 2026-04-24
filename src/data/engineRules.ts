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
  { id: 'MRL-G', label: 'MRL-G',     desc: 'Sin cuarto de máquinas — Chasis G (hasta 2000 kg, 8 paradas)' },
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
  { minKg: 1001, maxKg: 1250, model: 'MRL-G', minWidth: 1900, minDepth: 2200, maxSpeed: 2.0  },
  { minKg: 1251, maxKg: 1600, model: 'MRL-G', minWidth: 2000, minDepth: 2300, maxSpeed: 2.5  },
  { minKg: 1601, maxKg: 2000, model: 'MRL-G', minWidth: 2100, minDepth: 2400, maxSpeed: 2.5  },
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

// ─── TOPES DE VELOCIDAD POR MODELO (límite físico del equipo) ────────────────
// Independientes de la capacidad — la velocidad la gobierna el trayecto, no la carga.
const MODEL_MAX_SPEED: Record<string, number> = {
  'MRL-L':     1.0,
  'MRL-G':     2.5,
  'MR':        4.0,
  'HYD':       0.6,
  'Home Lift': 0.6,
};
export const getModelMaxSpeed = (model: ModelId): number =>
  MODEL_MAX_SPEED[model] ?? 4.0;

// ─── HELPERS ────────────────────────────────────────────────

export const getDims = (speed: number, model: ModelId) => {
  const exact = DIM_TABLE.find(r => r.speed === speed && r.model === model);
  if (exact) return { pit: exact.pit, overhead: exact.overhead };
  // Fallback: buscar más cercano hacia arriba del mismo modelo
  const fallback = DIM_TABLE.filter(r => r.model === model && r.speed >= speed)
    .sort((a, b) => a.speed - b.speed)[0];
  return fallback ? { pit: fallback.pit, overhead: fallback.overhead } : { pit: 1300, overhead: 3900 };
};

export const getShaftRule = (capacity: number, model?: ModelId) => {
  if (model) {
    const specific = SHAFT_RULES.find(r => capacity >= r.minKg && capacity <= r.maxKg && r.model === model);
    if (specific) return specific;
  }
  return SHAFT_RULES.find(r => capacity >= r.minKg && capacity <= r.maxKg);
};

/** @deprecated — reemplazado por minSpeedForTravel */
export const minSpeedForStops = (stops: number): number => {
  if (stops > 30) return 2.5;
  if (stops > 20) return 2.0;
  if (stops > 15) return 1.75;
  if (stops > 10) return 1.6;
  if (stops > 6)  return 1.0;
  return 0.6;
};

/**
 * Velocidad mínima recomendada por TRAYECTO — estándar industria (EN 81-20 + práctica MX)
 * A mayor recorrido, mayor velocidad mínima para mantener tiempos de viaje razonables.
 */
export const minSpeedForTravel = (travelMm: number): number => {
  if (travelMm > 75_000) return 2.5;  // > 75 m
  if (travelMm > 60_000) return 2.0;  // > 60 m
  if (travelMm > 45_000) return 1.75; // > 45 m
  if (travelMm > 30_000) return 1.6;  // > 30 m
  if (travelMm > 18_000) return 1.0;  // > 18 m
  return 0.6;                          // ≤ 18 m
};

/**
 * Velocidad ideal a sugerir automáticamente según trayecto.
 * Basado en estándar industria: v (m/s) ≈ recorrido / 20.
 */
export const recommendedSpeedForTravel = (travelMm: number): number => {
  if (travelMm > 75_000) return 3.0;
  if (travelMm > 60_000) return 2.5;
  if (travelMm > 45_000) return 2.0;
  if (travelMm > 30_000) return 1.75;
  if (travelMm > 18_000) return 1.6;
  if (travelMm > 12_000) return 1.0;
  return 0.6;
};

/** Modelo sugerido automáticamente según los parámetros */
export const suggestModel = (capacity: number, stops: number, travel: number): ModelId => {
  const HYD_MAX_TRAVEL = 12000;
  const HYD_MAX_STOPS  = 3;
  if (travel <= HYD_MAX_TRAVEL && stops <= HYD_MAX_STOPS && capacity <= 1000) return 'HYD';
  if (stops > 8 || capacity > 2000) return 'MR';
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
  if ((model === 'MRL-G'||model==='MRL-L') && capacity > 2000) { model = 'MR'; out.model = model; }
  if ((model === 'MRL-G'||model==='MRL-L') && stops > 8) { model = 'MR'; out.model = model; }
  if ((model === 'HYD'||model==='Home Lift') && (travel > 12000 || stops > 3)) { model = 'MRL-G'; out.model = model; }

  // 4. Velocidad — gobernada por TRAYECTO · techo por modelo (no por capacidad)
  const isHyd     = model === 'HYD' || model === 'Home Lift';
  const maxSpeed  = isHyd ? 0.6 : getModelMaxSpeed(model);
  const minSpeed  = isHyd ? 0.6 : minSpeedForTravel(travel);
  const recSpeed  = isHyd ? 0.6 : recommendedSpeedForTravel(travel);
  const currSpeed = parseFloat(String(current.speed ?? '0'));
  if (!current.speed || currSpeed < minSpeed || currSpeed > maxSpeed) {
    // Elegir la velocidad más cercana a la recomendada dentro del rango permitido
    const candidates = SPEEDS.map(parseFloat).filter(v => v >= minSpeed && v <= maxSpeed);
    const best = candidates.sort((a, b) => Math.abs(a - recSpeed) - Math.abs(b - recSpeed))[0];
    out.speed = String(best ?? minSpeed);
  }

  // 5. Fosa y huida
  const shaftRule = getShaftRule(capacity, model);
  const spd = parseFloat(String(out.speed ?? current.speed ?? 1.0));
  if (isHyd) {
    out.pit      = 1100;
    out.overhead = 3400;
  } else {
    const dims = getDims(spd, model);
    out.pit      = dims.pit;
    out.overhead = dims.overhead;
  }

  // 6. Cubo mínimo (dimensiones siguen dependiendo de la capacidad — correcto)
  if (shaftRule && !isHyd) {
    if (!current.shaft_width  || current.shaft_width  < shaftRule.minWidth)  out.shaft_width  = shaftRule.minWidth;
    if (!current.shaft_depth  || current.shaft_depth  < shaftRule.minDepth)  out.shaft_depth  = shaftRule.minDepth;
  }

  // 7. Tracción — campo reutilizado para "Nomenclatura de pisos" (editable por vendedor)
  // No se auto-sobreescribe; el placeholder en el formulario muestra generateFloorNomenclature(stops)
  // La tracción real se obtiene via autoTractionLabel() en el PDF

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

export const validate = (q: Partial<Quote>): ValidationResult => {
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
    if (capacity > 2000) err('capacity', `MRL-G: máx. 2000 kg. Actual: ${capacity} kg`);
    if (stops > 8)       err('stops',    `MRL-G: máx. 8 paradas recomendado. Actual: ${stops}`);
  }
  if (isHyd) {
    if (travel > 12000)  err('travel', `Hidráulico: máx. 12 m. Actual: ${(travel/1000).toFixed(1)} m`);
    if (stops > 3)       err('stops',  `Hidráulico: máx. 3 paradas. Actual: ${stops}`);
    if (speed > 0.63)    err('speed',  `Hidráulico: máx. 0.6 m/s. Actual: ${speed} m/s`);
  }

  // Velocidad — mínimo por trayecto, techo físico por modelo
  const minSpd = isHyd ? 0.6 : minSpeedForTravel(travel);
  const recSpd = isHyd ? 0.6 : recommendedSpeedForTravel(travel);
  const maxSpd = isHyd ? 0.6 : getModelMaxSpeed(model as ModelId);
  if (speed < minSpd)
    warn('speed', `Velocidad baja para ${(travel/1000).toFixed(0)} m de recorrido. Recomendado: ≥ ${recSpd} m/s`);
  if (speed > maxSpd)
    err('speed', `Máx. ${maxSpd} m/s para el modelo ${model}. Actual: ${speed} m/s`);

  // Cubo
  const shRule = getShaftRule(capacity, model as ModelId);
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
    if (id === 'MRL-L' && (capacity > 450  || stops > 8)) return false;
    if (id === 'MRL-G' && (capacity > 2000 || stops > 8)) return false;
    return true;
  });

/**
 * Velocidades disponibles para el selector del formulario.
 * Mínimo gobernado por trayecto, máximo por capacidad del equipo.
 */
/**
 * Velocidades disponibles para el selector del formulario.
 * Mínimo gobernado por trayecto · techo físico por modelo (no por capacidad).
 */
/**
 * Velocidades disponibles para el selector del formulario.
 * Piso = velocidad RECOMENDADA para el trayecto (evita selección manual de velocidades inadecuadas).
 * Techo = límite físico del modelo.
 */
export const getAllowedSpeeds = (model: ModelId, _capacity: number, _stops: number, travelMm = 15_000): string[] => {
  const isHyd  = model === 'HYD' || model === 'Home Lift';
  const maxSpd = isHyd ? 0.6 : getModelMaxSpeed(model);
  const minSpd = isHyd ? 0.6 : recommendedSpeedForTravel(travelMm);
  const valid  = SPEEDS.filter(s => { const v = parseFloat(s); return v >= minSpd && v <= maxSpd; });
  return valid.length > 0 ? valid : [String(Math.min(minSpd, maxSpd))];
};

// ─── CATÁLOGOS DE ACABADOS ────────────────────────────────────────

// ── Acabado de paredes de cabina ─────────────────────────────
// Imagen: /public/catalog/walls/[id].jpg (foto del panel de pared)
// Archivos esperados: inox-mate.jpg, inox-espejo.jpg, titanio.jpg, epoxico-gris.jpg, etc.
export const CABIN_WALLS = [
  { id: 'INOX-MATE',    label: 'INOX Mate',          use: ['Pasajeros'],           img: '/catalog/walls/inox-mate.jpg'    },
  { id: 'INOX-ESPEJO',  label: 'INOX Espejo',         use: ['Pasajeros'],           img: '/catalog/walls/inox-espejo.jpg'  },
  { id: 'TITANIO',      label: 'Titanio Dorado',      use: ['Pasajeros'],           img: '/catalog/walls/titanio.jpg'      },
  { id: 'EPOXICO-GRIS', label: 'Epóxico Gris',        use: ['Carga','Montaplatos'], img: '/catalog/walls/epoxico-gris.jpg' },
  { id: 'EPOXICO-BLANCO',label:'Epóxico Blanco',      use: ['Carga','Montaplatos'], img: '/catalog/walls/epoxico-blanco.jpg'},
];

// ── Extras seleccionables de cabina ──────────────────────────
export const CABIN_EXTRAS = [
  { id: 'panoramico',      label: 'Panel panorámico',    use: ['Pasajeros']           },
  { id: 'espejo-trasero',  label: 'Espejo trasero',       use: ['Pasajeros']           },
  { id: 'espejo-lateral',  label: 'Espejo lateral',       use: ['Pasajeros']           },
  { id: 'pasamanos-inox',  label: 'Pasamanos INOX',       use: ['Pasajeros','Carga']   },
  { id: 'pasamanos-crom',  label: 'Pasamanos Cromado',    use: ['Pasajeros']           },
  { id: 'led-premium',     label: 'Iluminación LED',      use: ['Pasajeros','Carga']   },
] as const;

export type CabinExtraId = typeof CABIN_EXTRAS[number]['id'];

/** Genera la descripción de cabina a partir de los atributos seleccionados */
export function buildCabinDescription(
  walls:   string,
  extras:  string[],
  floor:   string,
  plafon:  string,
  useType: string
): string {
  const parts: string[] = [];
  if (walls)  parts.push(`Cabina ${walls}`);
  if (extras.includes('panoramico'))     parts.push('panel panorámico');
  if (extras.includes('espejo-trasero')) parts.push('espejo trasero');
  if (extras.includes('espejo-lateral')) parts.push('espejo lateral');
  if (extras.includes('pasamanos-inox')) parts.push('pasamanos INOX');
  if (extras.includes('pasamanos-crom')) parts.push('pasamanos cromado');
  if (extras.includes('led-premium'))    parts.push('iluminación LED premium');
  if (floor)  parts.push(`piso ${floor}`);
  if (plafon) parts.push(`plafón ${plafon}`);
  if (useType === 'Carga' || useType === 'Montaplatos') parts.push('uso industrial');
  return parts.join(', ');
}

// ── Imagen: /public/catalog/finish/[id].jpg
// Archivos esperados: inox.jpg, inox-mirror.jpg, titanium.jpg, epoxy-grey.jpg, epoxy-white.jpg, epoxy-beige.jpg
export const CABIN_FINISHES = [
  { id: 'INOX',        label: 'Inox / Acero Inoxidable Mate 304', use: ['Pasajeros'],           img: '/catalog/finish/inox.jpg'        },
  { id: 'INOX-MIRROR', label: 'Inox / Acero Inoxidable Espejo',   use: ['Pasajeros'],           img: '/catalog/finish/inox-mirror.jpg' },
  { id: 'TITANIUM',    label: 'Titanio dorado',                   use: ['Pasajeros'],           img: '/catalog/finish/titanium.jpg'    },
  { id: 'EPOXY-GREY',  label: 'Epóxico Gris Industrial',          use: ['Carga','Montaplatos'], img: '/catalog/finish/epoxy-grey.jpg'  },
  { id: 'EPOXY-WHITE', label: 'Epóxico Blanco Industrial',        use: ['Carga','Montaplatos'], img: '/catalog/finish/epoxy-white.jpg' },
  { id: 'EPOXY-BEIGE', label: 'Epóxico Beige',                    use: ['Carga','Montaplatos'], img: '/catalog/finish/epoxy-beige.jpg' },
];

// ── Imagen: /public/catalog/floor/[id].jpg (80×80 px, muestra la textura)
// Archivos esperados: star-galaxy.jpg, blanco-perla.jpg, tan-brown.jpg, etc.
export const FLOOR_FINISHES = [
  { id: 'STAR-GALAXY',    label: 'Star Galaxy',    use: ['Pasajeros'],           img: '/catalog/floor/star-galaxy.jpg'    },
  { id: 'BLANCO-PERLA',   label: 'Blanco Perla',   use: ['Pasajeros'],           img: '/catalog/floor/blanco-perla.jpg'   },
  { id: 'TAN-BROWN',      label: 'Tan Brown',      use: ['Pasajeros'],           img: '/catalog/floor/tan-brown.jpg'      },
  { id: 'GIALLO-FIORITO', label: 'Giallo Fiorito', use: ['Pasajeros'],           img: '/catalog/floor/giallo-fiorito.jpg' },
  { id: 'MELISA',         label: 'Melisa',         use: ['Pasajeros'],           img: '/catalog/floor/melisa.jpg'         },
  { id: 'MULTICOLOR-RED', label: 'Multi-color Red',use: ['Pasajeros'],           img: '/catalog/floor/multicolor-red.jpg' },
  { id: 'SOFITA-BEJ',     label: 'Sofita Bej',     use: ['Pasajeros'],           img: '/catalog/floor/sofita-bej.jpg'     },
  { id: 'AFRICAN-LILAC',  label: 'African Lilac',  use: ['Pasajeros'],           img: '/catalog/floor/african-lilac.jpg'  },
  { id: 'NERO-ZIMBABWE',  label: 'Nero Zimbabwe',  use: ['Pasajeros'],           img: '/catalog/floor/nero-zimbabwe.jpg'  },
  { id: 'AFRICAN-RED',    label: 'African Red',    use: ['Pasajeros'],           img: '/catalog/floor/african-red.jpg'    },
  { id: 'EPOXY-FLOOR',    label: 'Epóxico Industrial', use: ['Carga','Montaplatos'], img: '/catalog/floor/epoxy-floor.jpg'    },
  { id: 'ALUMINUM',       label: 'Aluminio antiderrapante', use: ['Carga','Montaplatos'], img: '/catalog/floor/aluminum.jpg' },
  { id: 'GRATING',        label: 'Rejilla metálica',use: ['Carga','Montaplatos'], img: '/catalog/floor/grating.jpg'       },
];

// ── Imagen: /public/catalog/plafon/[id].jpg (150×150 px, foto del plafón)
// Archivos esperados: lv-10.jpg, lv-12.jpg, ..., lv-74.jpg
export const PLAFONOS = [
  { id: 'LV-10', label: 'LV-10', img: '/catalog/plafon/lv-10.jpg' },
  { id: 'LV-12', label: 'LV-12', img: '/catalog/plafon/lv-12.jpg' },
  { id: 'LV-20', label: 'LV-20', img: '/catalog/plafon/lv-20.jpg' },
  { id: 'LV-22', label: 'LV-22', img: '/catalog/plafon/lv-22.jpg' },
  { id: 'LV-26', label: 'LV-26', img: '/catalog/plafon/lv-26.jpg' },
  { id: 'LV-27', label: 'LV-27', img: '/catalog/plafon/lv-27.jpg' },
  { id: 'LV-29', label: 'LV-29 ✓', img: '/catalog/plafon/lv-29.jpg' },
  { id: 'LV-34', label: 'LV-34', img: '/catalog/plafon/lv-34.jpg' },
  { id: 'LV-37', label: 'LV-37', img: '/catalog/plafon/lv-37.jpg' },
  { id: 'LV-51', label: 'LV-51', img: '/catalog/plafon/lv-51.jpg' },
  { id: 'LV-52', label: 'LV-52', img: '/catalog/plafon/lv-52.jpg' },
  { id: 'LV-54', label: 'LV-54', img: '/catalog/plafon/lv-54.jpg' },
  { id: 'LV-62', label: 'LV-62', img: '/catalog/plafon/lv-62.jpg' },
  { id: 'LV-64', label: 'LV-64', img: '/catalog/plafon/lv-64.jpg' },
  { id: 'LV-68', label: 'LV-68', img: '/catalog/plafon/lv-68.jpg' },
  { id: 'LV-74', label: 'LV-74', img: '/catalog/plafon/lv-74.jpg' },
];

/** Genera la nomenclatura automática de pisos según el número de paradas */
export const generateFloorNomenclature = (stops: number): string => {
  const floors: string[] = [];
  for (let i = 0; i < stops; i++) {
    if (i === 0) floors.push('PB');
    else if (i === stops - 1 && stops > 2) floors.push('AZ');
    else floors.push(String(i));
  }
  return floors.join(', ');
};

/** Rieles automáticos según modelo */
export const autoRails = (model: string): { cabin: string; counterweight: string } => {
  if (model === 'MRL-G' || model === 'MR') return { cabin: 'T90', counterweight: 'T70' };
  if (model === 'MRL-L') return { cabin: 'T89', counterweight: 'T50' };
  if (model === 'HYD' || model === 'Home Lift') return { cabin: 'T70', counterweight: 'N/A' };
  return { cabin: 'T90', counterweight: 'T70' };
};

/** Sistema de tracción automático */
export const autoTractionLabel = (model: string, speed: string): string => {
  const spd = parseFloat(speed);
  if (model === 'HYD' || model === 'Home Lift') return 'Impulsión Hidráulica';
  if (spd <= 1.0) return 'Gearless 1:1';
  if (spd <= 1.75) return 'Gearless 2:1';
  return 'Gearless 2:1 Alta Velocidad';
};

/** Modelo de cabina sugerido por uso */
export const suggestCabinModel = (useType: string): string => {
  if (useType === 'Carga' || useType === 'Montaplatos') return 'ACC';
  return 'CLX-102B';
};
