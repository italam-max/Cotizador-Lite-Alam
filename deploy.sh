#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# deploy.sh — Sube el proyecto al repo y hace build para Vercel
# Ejecutar desde la raíz del proyecto: bash deploy.sh
# ─────────────────────────────────────────────────────────────

set -e  # Salir si hay cualquier error

echo ""
echo "🚀 Cotizador Alamex 2.0 — Deploy script"
echo "────────────────────────────────────────"

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Ejecuta este script desde la raíz del proyecto"
  exit 1
fi

# 2. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

# 3. Type check
echo ""
echo "🔍 Verificando TypeScript..."
npx tsc --noEmit && echo "✅ Sin errores de TypeScript"

# 4. Build
echo ""
echo "🔨 Generando build de producción..."
npm run build && echo "✅ Build generado en dist/"

# 5. Git
echo ""
echo "📤 Subiendo al repositorio..."

# Configurar remote si no existe
if ! git remote get-url origin &>/dev/null; then
  git remote add origin https://github.com/italam-max/Cotizador-Lite-Alam.git
  echo "✅ Remote configurado"
fi

git add -A
git status --short

echo ""
read -p "📝 Mensaje del commit (Enter para usar 'chore: update'): " MSG
MSG=${MSG:-"chore: update"}

git commit -m "$MSG" 2>/dev/null || echo "ℹ️  Sin cambios nuevos para commitear"
git push -u origin main

echo ""
echo "✅ Proyecto subido a: https://github.com/italam-max/Cotizador-Lite-Alam"
echo ""
echo "🌐 Para desplegar en Vercel:"
echo "   1. Ve a https://vercel.com → New Project"
echo "   2. Importa el repo: italam-max/Cotizador-Lite-Alam"
echo "   3. Agrega la variable: VITE_PB_URL = https://cotizadoralam.pockethost.io"
echo "   4. Deploy ✓"
echo ""
