# Cotizador Alamex 2.0

Plataforma interna de cotización y seguimiento de elevadores para el equipo Alamex.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · PocketBase · @react-pdf/renderer

---

## Setup local (primera vez)

### 1. Clonar el repo

```bash
git clone https://github.com/italam-max/Cotizador-Lite-Alam.git
cd Cotizador-Lite-Alam
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

El `.env` ya viene configurado con la URL de producción. Si quieres usar otra instancia, edita:

```
VITE_PB_URL=https://cotizadoralam.pockethost.io
```

### 3. Configurar PocketBase — importar el schema

1. Ve al panel de admin: **https://cotizadoralam.pockethost.io/_/**
2. Haz login con tu cuenta de admin
3. Ve a **Settings → Import collections**
4. Pega el contenido de `pb_schema.json`
5. Haz clic en **Review → Confirm**

Esto crea automáticamente:
- Colección `quotes` — cotizaciones con todos los campos
- Colección `quote_history` — historial de cambios de estado

### 4. Crear el primer usuario

En el panel de PocketBase:
1. Ve a **Collections → users**
2. Haz clic en **+ New record**
3. Llena: email, password, name, job_title
4. Guarda

> O bien crea usuarios desde la app una vez que esté corriendo (si habilitas el registro).

### 5. Correr en local

```bash
npm run dev
```

Abre **http://localhost:5173** — inicia sesión con el usuario creado en el paso anterior.

---

## Imágenes requeridas

Copia estas imágenes en la carpeta `public/images/`:

| Archivo | Uso |
|---|---|
| `logo-alamex.png` | Logo blanco para header y páginas del PDF |
| `logo-alamex-dark.png` | Logo color para portada del PDF |
| `fondo-login.jpg` | Foto de ciudad para portada del PDF |

Si `logo-alamex-dark.png` no existe, crea un alias temporal:
```bash
cp public/images/logo-alamex.png public/images/logo-alamex-dark.png
```

---

## Estructura del proyecto

```
src/
├── components/
│   ├── auth/LoginPage.tsx        — Pantalla de login premium
│   └── layout/AppShell.tsx       — Sidebar + layout principal
├── data/
│   └── engineRules.ts            — Motor de cálculo de elevadores (sin error humano)
├── features/
│   ├── quoter/
│   │   ├── Dashboard.tsx         — Lista de cotizaciones con stats
│   │   ├── QuoteForm.tsx         — Wizard inteligente de 3 pasos
│   │   └── QuoteDetail.tsx       — Detalle + historial de seguimiento
│   ├── pipeline/
│   │   └── Pipeline.tsx          — Vista Kanban por estado
│   └── pdf/
│       └── QuotePDF.tsx          — Generador PDF con portada Alamex
├── hooks/
│   └── useAuth.ts                — Autenticación con PocketBase
├── services/
│   ├── pb.ts                     — Cliente PocketBase (reemplaza Supabase)
│   └── quotesService.ts          — CRUD de cotizaciones e historial
└── types/
    └── index.ts                  — Tipos TypeScript completos
```

---

## Reglas de ingeniería implementadas

El motor en `engineRules.ts` elimina el error humano aplicando automáticamente:

| Regla | Descripción |
|---|---|
| **MRL-L** | Máx. 450 kg, máx. 8 paradas, requiere lado de apertura |
| **MRL-G** | Máx. 1000 kg, máx. 8 paradas, requiere cubo ≥ 1600 mm |
| **MR** | Para cargas altas (+1000 kg) o más de 8 paradas |
| **Hidráulico** | Máx. 12m recorrido, 3 paradas, 0.6 m/s — inapelable |
| **Velocidad mínima** | Por número de paradas según EN 81-20 |
| **Fosa y huida** | Automáticas por velocidad y modelo |
| **Control de grupo** | Simplex/Duplex/Triplex... según cantidad |
| **Tracción** | Automática por modelo (Bandas STM, Cable, Hidráulica) |
| **Personas** | Calculadas automáticamente desde la capacidad en kg |

---

## Despliegue en producción (Vercel)

### Opción A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Cuando Vercel pregunte por variables de entorno, agrega:
```
VITE_PB_URL = https://cotizadoralam.pockethost.io
```

### Opción B — Vercel Dashboard

1. Ve a **https://vercel.com** → New Project
2. Importa el repo `italam-max/Cotizador-Lite-Alam`
3. En **Environment Variables** agrega:
   - `VITE_PB_URL` = `https://cotizadoralam.pockethost.io`
4. Haz clic en **Deploy**

### Opción C — Build manual

```bash
npm run build
# Los archivos quedan en dist/
# Súbelos a cualquier hosting estático (Netlify, GitHub Pages, S3, etc.)
```

---

## Flujo de trabajo

```
Login
  └── Dashboard (lista de cotizaciones + stats)
        ├── Nueva cotización → Wizard 3 pasos:
        │     1. Cliente (nombre, email, tel., tipo de uso)
        │     2. Técnico (modelo, capacidad, paradas, vel., dimensiones, acabados)
        │     3. Comercial (proveedor interno, precio, notas)
        │          └── Guardar → Dashboard
        ├── Cotización existente (Borrador) → editar en Wizard
        └── Cotización enviada/activa → QuoteDetail
              ├── Cambiar estado (con nota en historial)
              ├── Descargar PDF (portada Alamex + specs + precio)
              └── Editar cotización

Seguimiento (Pipeline)
  └── Vista Kanban de todas las cotizaciones por estado
        Borrador → Enviada → En Negociación → Ganada / Perdida
```

---

## Variables de entorno

| Variable | Descripción | Valor actual |
|---|---|---|
| `VITE_PB_URL` | URL base de PocketBase | `https://cotizadoralam.pockethost.io` |

---

## Agregar nuevos usuarios

Desde el panel de PocketBase (`https://cotizadoralam.pockethost.io/_/`):

1. **Collections → users → + New record**
2. Campos:
   - `email` — correo del vendedor
   - `password` — contraseña temporal
   - `name` — nombre completo
   - `job_title` — puesto (ej: "Ejecutivo de Ventas")
   - `role` — `vendedor` o `gerente`

---

## Actualizar la aplicación

```bash
git pull origin main
npm install        # si cambiaron dependencias
npm run build      # generar nueva versión
# Vercel detecta el push y redespliega automáticamente si está conectado al repo
```

---

## Soporte

Proyecto desarrollado para uso interno de **Elevadores Alamex S.A. de C.V.**

Backend: [PocketHost](https://pockethost.io) · Frontend: [Vercel](https://vercel.com)
