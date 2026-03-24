// ARCHIVO: src/types/index.ts

import type { PBRecord, UserRecord } from '../services/pb';

export type { UserRecord };

export type QuoteStatus = 'Borrador' | 'Enviada' | 'En Negociación' | 'Ganada' | 'Perdida' | 'Cancelada';
export type ModelId    = 'MR' | 'MRL-L' | 'MRL-G' | 'HYD' | 'Home Lift';
export type UseType    = 'Pasajeros' | 'Carga' | 'Montaplatos';
export type Supplier   = 'Turco' | 'Chino';
export type DoorSide   = 'Izquierda' | 'Derecha' | 'N/A';
export type Currency   = 'MXN' | 'USD';

export interface CommercialTerms {
  paymentMethod:     string;
  deliveryTime:      string;
  warranty:          string;
  validity:          string;
  currency:          Currency;
  generalConditions: string;
}

// Cotización — mapea 1:1 con la colección PocketBase "quotes"
export interface Quote extends PBRecord {
  folio:            string;
  status:           QuoteStatus;
  client_name:      string;
  client_email:     string;
  client_phone:     string;
  project_date:     string;
  // Equipo
  model:            ModelId;
  use_type:         UseType;
  supplier:         Supplier;
  quantity:         number;
  capacity:         number;
  persons:          number;
  speed:            string;
  stops:            number;
  travel:           number;
  overhead:         number;
  pit:              number;
  shaft_width:      number;
  shaft_depth:      number;
  shaft_type:       string;
  control_group:    string;
  // Puertas y cabina
  door_type:        string;
  door_width:       number;
  door_height:      number;
  door_side:        DoorSide;
  cabin_model:      string;
  cabin_finish:     string;
  cabin_floor:      string;
  cop_model:        string;
  // Técnico
  norm:             string;
  traction:         string;
  // Comercial
  price:            number;
  currency:         Currency;
  internal_notes:   string;
  commercial_terms: CommercialTerms;
  owner_id:         string;
}

export interface QuoteHistory extends PBRecord {
  quote_id:    string;
  user_name:   string;
  from_status: string;
  to_status:   string;
  note:        string;
}

// Estado del formulario del wizard (antes de guardar en PB)
export const EMPTY_QUOTE: Omit<Quote, keyof PBRecord> = {
  folio:            '',
  status:           'Borrador',
  client_name:      '',
  client_email:     '',
  client_phone:     '',
  project_date:     new Date().toISOString().split('T')[0],
  model:            'MRL-G',
  use_type:         'Pasajeros',
  supplier:         'Turco',
  quantity:         1,
  capacity:         630,
  persons:          8,
  speed:            '1.6',
  stops:            6,
  travel:           15000,
  overhead:         3800,
  pit:              1300,
  shaft_width:      1800,
  shaft_depth:      1800,
  shaft_type:       'Concreto',
  control_group:    'Simplex',
  door_type:        'Automática Central',
  door_width:       1000,
  door_height:      2100,
  door_side:        'N/A',
  cabin_model:      'ASC',
  cabin_finish:     'Inox Satinado 304',
  cabin_floor:      'Granito',
  cop_model:        'Display Inteligente',
  norm:             'EN 81-20',
  traction:         'Bandas Planas (STM)',
  price:            0,
  currency:         'MXN',
  internal_notes:   '',
  commercial_terms: {
    paymentMethod:     '50% Anticipo — 40% Contra Embarque — 10% Contra Entrega',
    deliveryTime:      'A confirmar tras anticipo',
    warranty:          '12 meses en partes y mano de obra',
    validity:          '30 días naturales',
    currency:          'MXN',
    generalConditions: 'Obra civil por cuenta del cliente. Precios sujetos a variación cambiaria.',
  },
  owner_id: '',
};
