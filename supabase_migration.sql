-- ============================================================
-- COTIZADOR ALAMEX 2.0 — Migración Supabase
-- Pega esto en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ─── 1. TABLA PROFILES (extiende auth.users) ────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  job_title   TEXT,
  role        TEXT DEFAULT 'vendedor' CHECK (role IN ('admin','vendedor','gerente')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. TABLA QUOTES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  owner_id        UUID REFERENCES auth.users(id),
  -- Estado
  folio           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'Borrador'
                  CHECK (status IN ('Borrador','Enviada','En Negociación','Ganada','Perdida','Cancelada')),
  -- Cliente
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  client_phone    TEXT,
  project_date    DATE DEFAULT CURRENT_DATE,
  -- Equipo
  model           TEXT NOT NULL CHECK (model IN ('MR','MRL-L','MRL-G','HYD','Home Lift')),
  use_type        TEXT DEFAULT 'Pasajeros' CHECK (use_type IN ('Pasajeros','Carga','Montaplatos')),
  supplier        TEXT DEFAULT 'Turco' CHECK (supplier IN ('Turco','Chino')),
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  capacity        INTEGER NOT NULL DEFAULT 630,
  persons         INTEGER DEFAULT 8,
  speed           TEXT NOT NULL DEFAULT '1.6',
  stops           INTEGER NOT NULL DEFAULT 6 CHECK (stops >= 2),
  travel          INTEGER DEFAULT 15000,
  overhead        INTEGER DEFAULT 3800,
  pit             INTEGER DEFAULT 1300,
  shaft_width     INTEGER DEFAULT 1800,
  shaft_depth     INTEGER DEFAULT 1800,
  shaft_type      TEXT DEFAULT 'Concreto',
  control_group   TEXT DEFAULT 'Simplex',
  traction        TEXT,
  -- Puertas y cabina
  door_type       TEXT DEFAULT 'Automática Central',
  door_width      INTEGER DEFAULT 1000,
  door_height     INTEGER DEFAULT 2100,
  door_side       TEXT DEFAULT 'N/A' CHECK (door_side IN ('Izquierda','Derecha','N/A')),
  cabin_model     TEXT DEFAULT 'ASC',
  cabin_finish    TEXT,
  cabin_floor     TEXT,
  cop_model       TEXT,
  -- Normativa
  norm            TEXT DEFAULT 'EN 81-20',
  -- Comercial
  price           NUMERIC DEFAULT 0,
  currency        TEXT DEFAULT 'MXN' CHECK (currency IN ('MXN','USD')),
  internal_notes  TEXT,
  commercial_terms JSONB
);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_updated_at ON public.quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. TABLA QUOTE_HISTORY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  quote_id    UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  user_name   TEXT,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_history_quote_id ON public.quote_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON public.quote_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_owner ON public.quotes(owner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- ─── 4. ROW LEVEL SECURITY (RLS) ────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario ve solo su perfil (admins ven todos)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Quotes: todos los autenticados ven todas las cotizaciones del equipo
-- (en Alamex todos son equipo interno — sin restricción por owner)
CREATE POLICY "Authenticated users can read all quotes"
  ON public.quotes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quotes"
  ON public.quotes FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
  ON public.quotes FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete quotes"
  ON public.quotes FOR DELETE
  TO authenticated USING (true);

-- History: igual, todo el equipo puede leer y escribir
CREATE POLICY "Authenticated users can read history"
  ON public.quote_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert history"
  ON public.quote_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ─── 5. COLUMNAS ADICIONALES (v2 — ejecutar si la tabla ya existe) ──────────
-- Ciudad / lugar de instalación
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS installation_city TEXT;
-- Precio de mano de obra (opcional, null = no aplica)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS labor_price NUMERIC;
-- Tipo de sistema: Simplex, Duplex, Triplex, etc. (null = Simplex por defecto)
-- Cuando es distinto de Simplex, el precio capturado es del sistema completo (no se multiplica por cantidad)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS system_type TEXT DEFAULT 'Simplex';
-- Opciones de PDF (seguridades visibles, extras, etc.)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS pdf_options JSONB;

-- ─── 6. VERIFICACIÓN ────────────────────────────────────────
-- Corre esto para confirmar que todo quedó bien:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quotes' ORDER BY ordinal_position;
