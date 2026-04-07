/// <reference types="vite/client" />
// ARCHIVO: src/types/database.ts

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

export interface Profile {
  id:         string;
  email:      string | null;
  full_name:  string | null;
  job_title:  string | null;
  role:       'admin' | 'vendedor' | 'gerente';
  avatar_url: string | null;
  created_at: string;
}

export interface Quote {
  id:               string;
  created_at:       string;
  updated_at:       string;
  owner_id:         string;
  folio:            string;
  status:           QuoteStatus;
  client_name:      string;
  client_email:     string | null;
  client_phone:     string | null;
  project_date:     string;
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
  shaft_type:       string | null;
  control_group:    string | null;
  traction:         string | null;
  door_type:        string | null;
  door_width:       number;
  door_height:      number;
  door_side:        DoorSide;
  cabin_model:      string | null;
  cabin_finish:     string | null;
  cabin_floor:      string | null;
  cop_model:        string | null;
  norm:             string;
  price:            number;
  currency:         Currency;
  internal_notes:   string | null;
  commercial_terms: CommercialTerms | null;
}

export interface QuoteHistory {
  id:          string;
  created_at:  string;
  quote_id:    string;
  user_id:     string | null;
  user_name:   string | null;
  from_status: string | null;
  to_status:   string;
  note:        string | null;
}

// Database type — usamos any para las tablas para evitar conflictos con Supabase generics
export interface Database {
  public: {
    Tables: {
      profiles:      { Row: Profile;      Insert: any; Update: any };
      quotes:        { Row: Quote;        Insert: any; Update: any };
      quote_history: { Row: QuoteHistory; Insert: any; Update: any };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums:     Record<string, never>;
  };
}
