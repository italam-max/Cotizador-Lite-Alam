// ARCHIVO: src/types/index.ts
export type {
  Database, Profile, Quote, QuoteHistory,
  QuoteStatus, ModelId, UseType, Supplier, DoorSide, Currency, CommercialTerms,
} from './database';

import type { Quote } from './database';
type FormQuote = Omit<Quote, 'id'|'created_at'|'updated_at'>;

export const EMPTY_QUOTE: FormQuote = {
  owner_id: '', folio: '', status: 'Borrador',
  client_name: '', client_email: '', client_phone: '',
  project_date: new Date().toISOString().split('T')[0],
  model: 'MRL-G', use_type: 'Pasajeros', supplier: 'Turco',
  quantity: 1, capacity: 630, persons: 8, speed: '1.6',
  stops: 6, travel: 15000, overhead: 3800, pit: 1300,
  shaft_width: 1800, shaft_depth: 1800, shaft_type: 'Concreto',
  control_group: 'Punto Matriz', traction: 'Bandas Planas (STM)',
  door_type: 'Automática Central', door_width: 1000, door_height: 2100,
  door_side: 'N/A', cabin_model: 'ASC', cabin_finish: 'Inox Satinado 304',
  cabin_floor: 'Granito', cop_model: 'Display Inteligente', norm: 'EN 81-20',
  price: 0, currency: 'MXN', internal_notes: '',
  commercial_terms: {
    paymentMethod: '50% Anticipo a la firma del Contrato\n25% Al aviso de embarque\n20% Al aviso de entrega del equipo en obra\n05% Al aviso de entrega en funcionamiento',
    deliveryTime: 'A confirmar tras anticipo',
    warranty: '12 meses en partes y mano de obra',
    validity: '30 días naturales', currency: 'MXN',
    generalConditions: 'Obra civil por cuenta del cliente.',
  },
};
