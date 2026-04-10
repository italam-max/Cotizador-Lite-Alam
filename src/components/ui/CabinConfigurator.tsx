// ARCHIVO: src/components/ui/CabinConfigurator.tsx
// v8 — geometría proporcional, techo delgado, ambient occlusion, iluminación realista

import { useRef, useEffect, useCallback, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  wallFinish:  string;
  wallImg:     string;
  floorLabel:  string;
  floorImg:    string;
  plafonId:    string;
  plafonImg:   string;
  extras:      string[];
  onCapture?:  (dataUrl: string) => void;
}

const W = 460;
const H = 560;

// ── Geometría v8 ─────────────────────────────────────────────────────────────
// Techo reducido (~38px profundidad vs 334px de pared frontal = 11%)
// Paredes laterales con perspectiva natural
const FL  = { x: 110, y: 106 };   // front top-left
const FR  = { x: 350, y: 106 };   // front top-right
const FBL = { x: 110, y: 440 };   // front bottom-left
const FBR = { x: 350, y: 440 };   // front bottom-right
const LL  = { x: 8,   y: 68  };   // outer top-left
const LLB = { x: 8,   y: 482 };   // outer bottom-left
const RL  = { x: 452, y: 68  };   // outer top-right
const RLB = { x: 452, y: 482 };   // outer bottom-right

// ── Helpers de canvas ────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xff)+amt)},${Math.min(255,(n&0xff)+amt)})`;
}

export default function CabinConfigurator({
  wallFinish, wallImg, floorLabel, floorImg,
  plafonId, plafonImg, extras, onCapture
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [captured,  setCaptured]  = useState(false);

  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise(resolve => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const [wallTex, floorTex, plafonTex] = await Promise.all([
      loadImg(wallImg), loadImg(floorImg), loadImg(plafonImg),
    ]);

    // ── Paths ────────────────────────────────────────────────────────────────
    const pathFront = () => {
      ctx.beginPath();
      ctx.rect(FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
    };
    const pathLeft = () => {
      ctx.beginPath();
      ctx.moveTo(LL.x, LL.y); ctx.lineTo(FL.x, FL.y);
      ctx.lineTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
      ctx.closePath();
    };
    const pathRight = () => {
      ctx.beginPath();
      ctx.moveTo(FR.x, FR.y); ctx.lineTo(RL.x, RL.y);
      ctx.lineTo(RLB.x, RLB.y); ctx.lineTo(FBR.x, FBR.y);
      ctx.closePath();
    };
    const pathFloor = () => {
      ctx.beginPath();
      ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(FBR.x, FBR.y);
      ctx.lineTo(RLB.x, RLB.y); ctx.lineTo(LLB.x, LLB.y);
      ctx.closePath();
    };
    const pathCeil = () => {
      ctx.beginPath();
      ctx.moveTo(LL.x, LL.y);  ctx.lineTo(RL.x, RL.y);
      ctx.lineTo(FR.x, FL.y);  ctx.lineTo(FL.x, FL.y);
      ctx.closePath();
    };

    // ── 1. FONDO ─────────────────────────────────────────────────────────────
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    bgG.addColorStop(0, '#05070f');
    bgG.addColorStop(1, '#080b14');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // ── 2. PARED LATERAL IZQUIERDA ───────────────────────────────────────────
    ctx.save();
    pathLeft(); ctx.clip();
    ctx.fillStyle = '#0e111a';
    ctx.fill();
    if (wallTex) {
      // Proyectar textura con perspectiva: deformar src a destino
      ctx.globalAlpha = 0.42;
      ctx.drawImage(wallTex, LL.x, LL.y, FL.x - LL.x, LLB.y - LL.y);
      ctx.globalAlpha = 1;
    }
    // Sombra de perspectiva fuerte — lado recede hacia la izquierda
    const lGrad = ctx.createLinearGradient(LL.x, 0, FL.x, 0);
    lGrad.addColorStop(0,   'rgba(0,0,0,0.82)');
    lGrad.addColorStop(0.45,'rgba(0,0,0,0.52)');
    lGrad.addColorStop(1,   'rgba(0,0,0,0.08)');
    pathLeft(); ctx.fillStyle = lGrad; ctx.fill();
    // Luz cenital desde el techo (top a bottom, más brillante arriba)
    const lTop = ctx.createLinearGradient(0, LL.y, 0, LLB.y);
    lTop.addColorStop(0,   'rgba(255,255,255,0.06)');
    lTop.addColorStop(0.3, 'rgba(255,255,255,0.01)');
    lTop.addColorStop(1,   'rgba(0,0,0,0.10)');
    pathLeft(); ctx.fillStyle = lTop; ctx.fill();
    // Highlight en la arista frontal
    const lEdge = ctx.createLinearGradient(FL.x - 22, 0, FL.x, 0);
    lEdge.addColorStop(0, 'rgba(255,255,255,0)');
    lEdge.addColorStop(1, 'rgba(255,255,255,0.07)');
    pathLeft(); ctx.fillStyle = lEdge; ctx.fill();
    ctx.restore();

    // ── 3. PARED LATERAL DERECHA ─────────────────────────────────────────────
    ctx.save();
    pathRight(); ctx.clip();
    ctx.fillStyle = '#0c0f18';
    ctx.fill();
    if (wallTex) {
      ctx.globalAlpha = 0.42;
      ctx.drawImage(wallTex, FR.x, FR.y, RL.x - FR.x, RLB.y - FR.y);
      ctx.globalAlpha = 1;
    }
    const rGrad = ctx.createLinearGradient(FR.x, 0, RL.x, 0);
    rGrad.addColorStop(0,   'rgba(0,0,0,0.08)');
    rGrad.addColorStop(0.55,'rgba(0,0,0,0.52)');
    rGrad.addColorStop(1,   'rgba(0,0,0,0.82)');
    pathRight(); ctx.fillStyle = rGrad; ctx.fill();
    const rTop = ctx.createLinearGradient(0, RL.y, 0, RLB.y);
    rTop.addColorStop(0,   'rgba(255,255,255,0.06)');
    rTop.addColorStop(0.3, 'rgba(255,255,255,0.01)');
    rTop.addColorStop(1,   'rgba(0,0,0,0.10)');
    pathRight(); ctx.fillStyle = rTop; ctx.fill();
    const rEdge = ctx.createLinearGradient(FR.x, 0, FR.x + 22, 0);
    rEdge.addColorStop(0, 'rgba(255,255,255,0.07)');
    rEdge.addColorStop(1, 'rgba(255,255,255,0)');
    pathRight(); ctx.fillStyle = rEdge; ctx.fill();
    ctx.restore();

    // ── 4. PARED FRONTAL ─────────────────────────────────────────────────────
    ctx.save();
    pathFront(); ctx.clip();
    if (wallTex) {
      ctx.globalAlpha = 0.94;
      ctx.drawImage(wallTex, FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#252b3a';
      pathFront(); ctx.fill();
    }
    // Iluminación suave desde el plafón — gradiente radial centrado arriba
    const wLight = ctx.createRadialGradient(W / 2, FL.y - 20, 0, W / 2, FL.y + 80, 240);
    wLight.addColorStop(0,    'rgba(255,255,255,0.11)');
    wLight.addColorStop(0.40, 'rgba(255,255,255,0.03)');
    wLight.addColorStop(1,    'rgba(0,0,0,0.22)');
    pathFront(); ctx.fillStyle = wLight; ctx.fill();
    // Sombra en esquinas de pared frontal (vignette)
    const vL = ctx.createLinearGradient(FL.x, 0, FL.x + 38, 0);
    vL.addColorStop(0, 'rgba(0,0,0,0.28)'); vL.addColorStop(1, 'rgba(0,0,0,0)');
    pathFront(); ctx.fillStyle = vL; ctx.fill();
    const vR = ctx.createLinearGradient(FR.x - 38, 0, FR.x, 0);
    vR.addColorStop(0, 'rgba(0,0,0,0)'); vR.addColorStop(1, 'rgba(0,0,0,0.28)');
    pathFront(); ctx.fillStyle = vR; ctx.fill();
    ctx.restore();

    // ── 5. TECHO / PLAFÓN ────────────────────────────────────────────────────
    ctx.save();
    pathCeil(); ctx.clip();
    // Base del techo (color neutro oscuro si no hay textura)
    ctx.fillStyle = '#1a1e2a';
    ctx.fill();
    if (plafonTex) {
      // Dibujar el plafón centrado en el área del techo
      const ceilW = RL.x - LL.x;
      const ceilH = FL.y - LL.y;
      // Escalar imagen del plafón para que quepa correctamente
      const imgAR = plafonTex.naturalWidth / plafonTex.naturalHeight;
      const areaAR = ceilW / ceilH;
      let dw = ceilW, dh = ceilH;
      if (imgAR > areaAR) { dh = ceilW / imgAR; } else { dw = ceilH * imgAR; }
      const dx = LL.x + (ceilW - dw) / 2;
      const dy = LL.y + (ceilH - dh) / 2;
      ctx.globalAlpha = 0.88;
      ctx.drawImage(plafonTex, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
    // Velo brillante — simula que el techo recibe luz directa
    const cGlow = ctx.createLinearGradient(W / 2, LL.y, W / 2, FL.y);
    cGlow.addColorStop(0, 'rgba(255,255,255,0.22)');
    cGlow.addColorStop(0.6, 'rgba(255,255,255,0.06)');
    cGlow.addColorStop(1, 'rgba(200,210,240,0.00)');
    pathCeil(); ctx.fillStyle = cGlow; ctx.fill();
    // Sombra de perspectiva lateral en el techo
    const cShadL = ctx.createLinearGradient(LL.x, 0, LL.x + 60, 0);
    cShadL.addColorStop(0, 'rgba(0,0,0,0.45)'); cShadL.addColorStop(1, 'rgba(0,0,0,0)');
    pathCeil(); ctx.fillStyle = cShadL; ctx.fill();
    const cShadR = ctx.createLinearGradient(RL.x - 60, 0, RL.x, 0);
    cShadR.addColorStop(0, 'rgba(0,0,0,0)'); cShadR.addColorStop(1, 'rgba(0,0,0,0.45)');
    pathCeil(); ctx.fillStyle = cShadR; ctx.fill();
    ctx.restore();

    // ── 6. PISO ───────────────────────────────────────────────────────────────
    ctx.save();
    pathFloor(); ctx.clip();
    if (floorTex) {
      const flH  = LLB.y - FBL.y;
      const numS = 24;
      for (let i = 0; i < numS; i++) {
        const t0 = i / numS, t1 = (i + 1) / numS;
        const y0  = FBL.y + t0 * flH, y1 = FBL.y + t1 * flH;
        const x0L = FBL.x + (LLB.x - FBL.x) * t0, x0R = FBR.x + (RLB.x - FBR.x) * t0;
        const x1L = FBL.x + (LLB.x - FBL.x) * t1, x1R = FBR.x + (RLB.x - FBR.x) * t1;
        const stripeW = x0R - x0L, stripeH = y1 - y0 + 1;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0L, y0); ctx.lineTo(x0R, y0);
        ctx.lineTo(x1R, y1+1); ctx.lineTo(x1L, y1+1);
        ctx.closePath(); ctx.clip();

        const srcY = Math.floor(t0 * floorTex.naturalHeight);
        const srcH = Math.max(1, Math.floor((t1 - t0) * floorTex.naturalHeight));
        ctx.globalAlpha = 0.92;
        ctx.drawImage(floorTex, 0, srcY, floorTex.naturalWidth, srcH, x0L, y0, stripeW, stripeH);
        ctx.globalAlpha = 1;

        // Oscurecer en profundidad
        ctx.fillStyle = `rgba(0,0,0,${0.03 + t0 * 0.50})`;
        ctx.fillRect(x0L - 2, y0, stripeW + 4, stripeH + 1);
        ctx.restore();
      }
      // Reflejo especular sutil en el piso
      const rfl = ctx.createLinearGradient(W / 2, FBL.y, W / 2, LLB.y);
      rfl.addColorStop(0,   'rgba(255,255,255,0.10)');
      rfl.addColorStop(0.25,'rgba(255,255,255,0.03)');
      rfl.addColorStop(1,   'rgba(0,0,0,0)');
      pathFloor(); ctx.fillStyle = rfl; ctx.fill();
    } else {
      const fg = ctx.createLinearGradient(W / 2, FBL.y, W / 2, LLB.y);
      fg.addColorStop(0, '#32364a'); fg.addColorStop(1, '#1a1d28');
      pathFloor(); ctx.fillStyle = fg; ctx.fill();
    }
    ctx.restore();

    // ── 7. AMBIENT OCCLUSION en aristas ──────────────────────────────────────
    // Esquina izq-frontal (arista vertical)
    ctx.save();
    const aoL = ctx.createLinearGradient(FL.x - 28, 0, FL.x + 10, 0);
    aoL.addColorStop(0, 'rgba(0,0,0,0)');
    aoL.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = aoL;
    ctx.fillRect(FL.x - 28, FL.y, 38, FBL.y - FL.y);
    // Esquina der-frontal
    const aoR = ctx.createLinearGradient(FR.x - 10, 0, FR.x + 28, 0);
    aoR.addColorStop(0, 'rgba(0,0,0,0.38)');
    aoR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aoR;
    ctx.fillRect(FR.x - 10, FR.y, 38, FBR.y - FR.y);
    // Arista pared-techo
    const aoTop = ctx.createLinearGradient(0, FL.y, 0, FL.y + 28);
    aoTop.addColorStop(0, 'rgba(0,0,0,0.32)');
    aoTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aoTop;
    ctx.fillRect(FL.x, FL.y, FR.x - FL.x, 28);
    // Arista pared-piso
    const aoBot = ctx.createLinearGradient(0, FBL.y - 22, 0, FBL.y);
    aoBot.addColorStop(0, 'rgba(0,0,0,0)');
    aoBot.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = aoBot;
    ctx.fillRect(FL.x, FBL.y - 22, FR.x - FL.x, 22);
    ctx.restore();

    // ── 8. BORDES ESTRUCTURALES ───────────────────────────────────────────────
    ctx.save();
    // Marco de pared frontal
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(FL.x + 0.75, FL.y + 0.75, FR.x - FL.x - 1.5, FBL.y - FL.y - 1.5);
    // Líneas de perspectiva tenue
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FL.x, FL.y); ctx.lineTo(LL.x, LL.y);
    ctx.moveTo(FR.x, FR.y); ctx.lineTo(RL.x, RL.y);
    ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
    ctx.moveTo(FBR.x, FBR.y); ctx.lineTo(RLB.x, RLB.y);
    ctx.stroke();
    // Línea dorada zócalo inferior
    ctx.strokeStyle = 'rgba(212,175,55,0.65)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(FL.x, FBL.y); ctx.lineTo(FR.x, FBR.y); ctx.stroke();
    // Línea dorada zócalo piso lateral izq
    ctx.strokeStyle = 'rgba(212,175,55,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
    ctx.moveTo(FBR.x, FBR.y); ctx.lineTo(RLB.x, RLB.y);
    ctx.stroke();
    // Línea dorada cornisa superior
    ctx.strokeStyle = 'rgba(212,175,55,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(FL.x, FL.y); ctx.lineTo(FR.x, FR.y); ctx.stroke();
    ctx.restore();

    // ── 9. EXTRAS ────────────────────────────────────────────────────────────

    // Espejo trasero
    if (extras.includes('espejo-trasero')) {
      const mx = FL.x + 18, my = FL.y + 22, mw = (FR.x - FL.x) - 36, mh = (FBL.y - FL.y) * 0.48;
      ctx.save();
      // Marco del espejo
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.strokeStyle = 'rgba(215,220,230,0.80)'; ctx.lineWidth = 3;
      ctx.strokeRect(mx, my, mw, mh);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Interior espejo
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(mx + 3, my + 3, mw - 6, mh - 6);
      const mg = ctx.createLinearGradient(mx, my, mx + mw * 0.7, my + mh);
      mg.addColorStop(0,    'rgba(255,255,255,0.24)');
      mg.addColorStop(0.3,  'rgba(200,215,240,0.12)');
      mg.addColorStop(0.7,  'rgba(255,255,255,0.06)');
      mg.addColorStop(1,    'rgba(180,195,220,0.15)');
      ctx.fillStyle = mg; ctx.fillRect(mx, my, mw, mh);
      // Reflejo diagonal
      ctx.save();
      ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(mx + mw * 0.10, my); ctx.lineTo(mx, my + mh * 0.28); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(mx + mw * 0.30, my); ctx.lineTo(mx + mw * 0.05, my + mh * 0.5); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    // Espejo lateral
    if (extras.includes('espejo-lateral')) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(LL.x + 6, LL.y + 18); ctx.lineTo(FL.x - 2, FL.y + 18);
      ctx.lineTo(FBL.x - 2, FBL.y - 18); ctx.lineTo(LLB.x + 6, LLB.y - 28);
      ctx.closePath(); ctx.clip();
      const lg = ctx.createLinearGradient(LL.x, 0, FL.x, 0);
      lg.addColorStop(0,   'rgba(255,255,255,0.03)');
      lg.addColorStop(0.5, 'rgba(220,232,255,0.18)');
      lg.addColorStop(1,   'rgba(255,255,255,0.06)');
      ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = 'rgba(200,210,225,0.50)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }

    // Pasamanos
    if (extras.includes('pasamanos-inox') || extras.includes('pasamanos-crom')) {
      const isCrom = extras.includes('pasamanos-crom');
      const py = FL.y + (FBL.y - FL.y) * 0.46;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      const rg = ctx.createLinearGradient(0, py - 6, 0, py + 7);
      if (isCrom) {
        rg.addColorStop(0,    '#f4f4f6');
        rg.addColorStop(0.35, '#bcbcc0');
        rg.addColorStop(0.65, '#e6e6ea');
        rg.addColorStop(1,    '#9c9ca0');
      } else {
        rg.addColorStop(0,    '#eceef2');
        rg.addColorStop(0.35, '#aab0bc');
        rg.addColorStop(0.65, '#dadfe8');
        rg.addColorStop(1,    '#888e9c');
      }
      ctx.strokeStyle = rg; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(FL.x + 12, py); ctx.lineTo(FR.x - 12, py); ctx.stroke();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Highlight superior
      ctx.strokeStyle = 'rgba(255,255,255,0.58)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(FL.x + 14, py - 3); ctx.lineTo(FR.x - 14, py - 3); ctx.stroke();
      // Soportes
      [0.18, 0.50, 0.82].forEach(t => {
        const sx = FL.x + (FR.x - FL.x) * t;
        ctx.shadowBlur = 3;
        ctx.strokeStyle = isCrom ? '#b0b0b6' : '#a2a8b6';
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, py + 5.5); ctx.lineTo(sx, py + 26); ctx.stroke();
      });
      ctx.restore();
    }

    // ── 10. BOTONERA COP ──────────────────────────────────────────────────────
    {
      const bx = FR.x - 54, by = FL.y + (FBL.y - FL.y) * 0.22, bw = 40, bh = 120;
      ctx.save();
      // Sombra del panel
      ctx.shadowColor = 'rgba(0,0,0,0.70)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = -6; ctx.shadowOffsetY = 8;
      const bodyG = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bodyG.addColorStop(0,   '#171b26');
      bodyG.addColorStop(0.45,'#222636');
      bodyG.addColorStop(1,   '#171b26');
      ctx.fillStyle = bodyG;
      roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      // Borde del panel
      const brdG = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      brdG.addColorStop(0, '#424a5e'); brdG.addColorStop(1, '#252c3c');
      ctx.strokeStyle = brdG; ctx.lineWidth = 1.2;
      roundRect(ctx, bx, by, bw, bh, 6); ctx.stroke();
      // Línea reflejo izq
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx + 1.5, by + 8); ctx.lineTo(bx + 1.5, by + bh - 8); ctx.stroke();

      // Pantalla digital
      const sx = bx + 5, sy = by + 6, sw = bw - 10, sh = 24;
      ctx.fillStyle = '#040d18';
      roundRect(ctx, sx, sy, sw, sh, 3); ctx.fill();
      const scrG = ctx.createLinearGradient(sx, sy, sx, sy + sh);
      scrG.addColorStop(0, 'rgba(79,195,247,0.20)');
      scrG.addColorStop(1, 'rgba(30,80,200,0.08)');
      ctx.fillStyle = scrG;
      roundRect(ctx, sx, sy, sw, sh, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(79,195,247,0.30)'; ctx.lineWidth = 0.8;
      roundRect(ctx, sx, sy, sw, sh, 3); ctx.stroke();
      // Texto de piso
      ctx.fillStyle = '#4fc3f7'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(79,195,247,0.80)'; ctx.shadowBlur = 6;
      ctx.fillText('PB', bx + bw / 2, sy + 16); ctx.shadowBlur = 0;
      // Separador
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(bx + 6, sy + sh + 4); ctx.lineTo(bx + bw - 6, sy + sh + 4); ctx.stroke();

      // Botones de piso
      const buttons = [
        { color: '#c8a820', label: '▲', glow: 'rgba(212,175,55,0.75)' },
        { color: '#2a60d8', label: '4', glow: 'rgba(42,96,216,0.55)' },
        { color: '#3a6ed8', label: '3', glow: 'rgba(58,110,216,0.50)' },
        { color: '#424858', label: '2', glow: 'rgba(66,72,88,0.40)'  },
        { color: '#424858', label: '1', glow: 'rgba(66,72,88,0.40)'  },
        { color: '#b83018', label: '✕', glow: 'rgba(184,48,24,0.60)' },
      ];
      buttons.forEach((btn, i) => {
        const btnY = by + 40 + i * 13, btnX = bx + bw / 2;
        ctx.shadowColor = btn.glow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
        const bG = ctx.createRadialGradient(btnX - 1.5, btnY - 1.5, 0, btnX, btnY, 5.5);
        bG.addColorStop(0, lighten(btn.color, 40));
        bG.addColorStop(1, btn.color);
        ctx.fillStyle = bG;
        ctx.beginPath(); ctx.arc(btnX, btnY, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        // Specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.beginPath(); ctx.arc(btnX - 1.2, btnY - 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.90)'; ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(btn.label, btnX, btnY + 2.2);
      });

      // Speaker
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh - 10, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(160,172,192,0.38)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.font = '5px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('COP', bx + bw / 2, by + bh - 20);
      ctx.restore();
    }

    // ── 11. LUZ LED premium ───────────────────────────────────────────────────
    if (extras.includes('led-premium')) {
      const ambG = ctx.createRadialGradient(W / 2, FL.y + 5, 0, W / 2, FL.y + 5, W * 0.65);
      ambG.addColorStop(0,   'rgba(255,252,220,0.18)');
      ambG.addColorStop(0.5, 'rgba(255,250,200,0.05)');
      ambG.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = ambG; ctx.fillRect(0, 0, W, H);
      [0.20, 0.50, 0.80].forEach(t => {
        const sx = FL.x + (FR.x - FL.x) * t, sy = FL.y + 6;
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
        halo.addColorStop(0,   'rgba(255,252,230,0.24)');
        halo.addColorStop(0.5, 'rgba(255,250,200,0.07)');
        halo.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = halo; ctx.fillRect(sx - 72, sy - 5, 144, 100);
        ctx.shadowColor = 'rgba(255,252,220,0.85)'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#fffff8';
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ── 12. VENTANA PANORÁMICA ────────────────────────────────────────────────
    if (extras.includes('panoramico')) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(RL.x - 7, RL.y + 14); ctx.lineTo(FR.x + 3, FR.y + 20);
      ctx.lineTo(FBR.x + 3, FBR.y - 20); ctx.lineTo(RLB.x - 7, RLB.y - 24);
      ctx.closePath(); ctx.clip();
      const pg = ctx.createLinearGradient(FR.x, 0, RL.x, 0);
      pg.addColorStop(0, 'rgba(140,195,255,0.10)');
      pg.addColorStop(1, 'rgba(175,218,255,0.26)');
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = 'rgba(140,195,255,0.38)'; ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]); ctx.stroke();
      ctx.restore();
    }

    // ── 13. VIGNETTE GLOBAL ───────────────────────────────────────────────────
    {
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    }

    // ── 14. FOOTER ────────────────────────────────────────────────────────────
    {
      const fh = 52;
      ctx.fillStyle = 'rgba(5,8,16,0.93)'; ctx.fillRect(0, H - fh, W, fh);
      // Línea dorada superior del footer
      ctx.fillStyle = '#D4AF37'; ctx.fillRect(0, H - fh, W, 1.5);
      // Título
      ctx.fillStyle = '#D4AF37'; ctx.font = 'bold 8.5px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✦  CONFIGURACIÓN DE CABINA', 14, H - fh + 16);
      // Descripción
      ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '8.5px "DM Sans", sans-serif';
      const desc = `${(wallFinish||'Estándar').substring(0,22)}  ·  Piso: ${(floorLabel||'Estándar').substring(0,20)}  ·  ${plafonId||'LV-29'}`;
      ctx.fillText(desc, 14, H - fh + 30);
      // Extras
      const extraLabels: Record<string, string> = {
        'espejo-trasero': 'Espejo Fondo','espejo-lateral': 'Esp. Lateral',
        'pasamanos-inox': 'Pasam. Inox','pasamanos-crom': 'Pasam. Crom',
        'led-premium': 'LED Premium','panoramico': 'Panorámico',
      };
      const el = extras.slice(0, 5).map(e => extraLabels[e] || e).join(' · ');
      if (el) {
        ctx.fillStyle = 'rgba(212,175,55,0.68)'; ctx.font = '7.5px "DM Sans", sans-serif';
        ctx.fillText(el, 14, H - fh + 44);
      }
      // Watermark
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('ALAMEX', W - 12, H - fh + 44); ctx.globalAlpha = 1;
    }

  }, [wallImg, floorImg, plafonImg, extras, wallFinish, floorLabel, plafonId]);

  useEffect(() => { draw(); }, [draw]);

  const handleCapture = async () => {
    setCapturing(true);
    await draw();
    const canvas = canvasRef.current;
    if (canvas) {
      onCapture?.(canvas.toDataURL('image/jpeg', 0.94));
      setCaptured(true);
      setTimeout(() => setCaptured(false), 3000);
    }
    setCapturing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.14)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      {/* Botón captura */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={capturing}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        style={{
          background: captured ? '#059669' : '#0A2463',
          color: 'white',
          fontFamily: "'Syne', sans-serif",
          boxShadow: captured
            ? '0 4px 16px rgba(5,150,105,0.35)'
            : '0 4px 16px rgba(10,36,99,0.40)',
        }}
      >
        {capturing
          ? <><RefreshCw size={14} className="animate-spin" />Procesando...</>
          : captured
            ? <><CheckCircle2 size={14} />Imagen capturada para la propuesta</>
            : <><Camera size={14} />Capturar para PDF</>
        }
      </button>

      <p className="text-[10px] text-[#0A2463]/40 text-center leading-tight">
        Vista referencial · La imagen se incluirá en la propuesta al cliente
      </p>
    </div>
  );
}
