# Cotizador Alamex 2.0

Plataforma interna de cotización y seguimiento de elevadores.

**Stack:** React 19 · TypeScript · Vite · Tailwind · Supabase · @react-pdf/renderer

---

## Setup en 10 minutos

### 1. Crear proyecto en Supabase (gratis)

1. Ve a **https://supabase.com** → New Project
2. Nombre: `cotizador-alamex` · Región: `us-east-1`
3. Guarda la contraseña que te genera
4. Ve a **Settings → API** y copia:
   - `Project URL`
   - `anon / public key`

### 2. Clonar el repo

```bash
git clone https://github.com/italam-max/Cotizador-Lite-Alam.git
cd Cotizador-Lite-Alam
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz con tus credenciales:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Crear las tablas en Supabase

1. Supabase Dashboard → **SQL Editor** → New query
2. Pega el contenido completo de `supabase_migration.sql`
3. Haz clic en **Run**
4. Deberías ver: `profiles`, `quotes`, `quote_history` en el listado de tablas

### 5. Crear el primer usuario

**Opción A — Desde Supabase Dashboard:**
1. Authentication → Users → Invite user
2. Envía invitación al email del vendedor
3. El vendedor crea su contraseña desde el link

**Opción B — Desde SQL Editor:**
```sql
-- Crear usuario directamente (solo para pruebas)
SELECT auth.uid(); -- Verifica que estés autenticado como admin
```

**Opción C — Habilitar registro desde la app:**
1. Supabase → Authentication → Providers → Email
2. Activa "Enable Email Signup"
3. Desde la pantalla de login de la app aparecerá un botón de registro

### 6. Correr localmente

```bash
npm run dev
# Abre http://localhost:5173
```

### 7. Agregar imágenes de Alamex

Copia estas imágenes en `public/images/`:

| Archivo | Uso |
|---|---|
| `logo-alamex.png` | Logo blanco — header y páginas del PDF |
| `logo-alamex-dark.png` | Logo color — portada del PDF |
| `fondo-login.jpg` | Foto ciudad — portada del PDF |

```bash
# Si no tienes logo-alamex-dark.png todavía:
cp public/images/logo-alamex.png public/images/logo-alamex-dark.png
```

---

## Despliegue en producción (Vercel)

### Opción A — Vercel Dashboard (recomendado)

1. Ve a **https://vercel.com** → New Project
2. Importa el repo: `italam-max/Cotizador-Lite-Alam`
3. En **Environment Variables** agrega:
   ```
   VITE_SUPABASE_URL       → https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY  → eyJ...
   ```
4. Haz clic en **Deploy**
5. URL automática: `cotizador-lite-alam.vercel.app`

Cada `git push` al repositorio redespliega automáticamente.

### Opción B — Vercel CLI (Windows)

```powershell
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy desde la carpeta del proyecto
vercel --prod
```

### Opción C — Build manual

```bash
npm run build
# Archivos generados en dist/
# Súbelos a cualquier hosting estático
```

---

## Subir cambios al repositorio

```bash
git add -A
git commit -m "descripción del cambio"
git push origin main
# Vercel redespliega automáticamente en ~1 minuto
```

---

## Estructura del proyecto

```
src/
├── components/
│   ├── auth/LoginPage.tsx          — Login premium
│   └── layout/AppShell.tsx         — Sidebar + layout
├── data/
│   └── engineRules.ts              — Motor de cálculo (sin error humano)
├── features/
│   ├── quoter/
│   │   ├── Dashboard.tsx           — Lista con stats
│   │   ├── QuoteForm.tsx           — Wizard 3 pasos
│   │   └── QuoteDetail.tsx         — Detalle + historial
│   ├── pipeline/
│   │   └── Pipeline.tsx            — Kanban por estado
│   └── pdf/
│       └── QuotePDF.tsx            — PDF con portada Alamex
├── hooks/
│   └── useAuth.ts                  — Auth Supabase
├── services/
│   ├── supabase.ts                 — Cliente Supabase
│   └── quotesService.ts            — CRUD completo
└── types/
    ├── database.ts                 — Tipos de tablas
    └── index.ts                    — Exports + EMPTY_QUOTE
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/public de Supabase |

⚠️ El archivo `.env` **nunca se sube al repo** (está en `.gitignore`).
En Vercel configuras las variables directamente en el dashboard.

---

## Agregar nuevos vendedores

Desde Supabase Dashboard:
1. **Authentication → Users → Invite user**
2. Ingresa el email del vendedor
3. El vendedor recibe un link para crear su contraseña
4. Después de que inicia sesión, ve a **Table Editor → profiles** y actualiza:
   - `full_name` — nombre completo
   - `job_title` — puesto (ej: "Ejecutivo de Ventas")
   - `role` — `vendedor` o `gerente`

---

Desarrollado para uso interno de **Elevadores Alamex S.A. de C.V.**
