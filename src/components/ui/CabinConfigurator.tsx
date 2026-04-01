// ARCHIVO: src/components/ui/CabinConfigurator.tsx
// Configurador visual de cabina — canvas 2D con composición de texturas.
// Muestra una cabina base con las texturas del acabado, piso y plafón superpuestas.
// Al hacer clic en "Capturar" → genera imagen PNG que va al PDF.

import { useRef, useEffect, useCallback, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface Props {
  wallFinish:  string;  // label del acabado de paredes
  wallImg:     string;  // ruta /catalog/walls/...
  floorLabel:  string;
  floorImg:    string;  // ruta /catalog/floor/...
  plafonId:    string;
  plafonImg:   string;  // ruta /catalog/plafon/...
  extras:      string[];
  onCapture?:  (dataUrl: string) => void; // callback con imagen en base64
}

// Dimensiones del canvas de la cabina
const W = 420;
const H = 520;

export default function CabinConfigurator({ wallFinish, wallImg, floorLabel, floorImg, plafonId, plafonImg, extras, onCapture }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [captured,  setCaptured]  = useState(false);

  // ── Función principal de dibujo ───────────────────────────
  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // ── Función helper: cargar imagen con fallback ────────
    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise(resolve => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    // ── 1. FONDO DE LA CABINA ─────────────────────────────
    // Forma de cabina: perspectiva sencilla isométrica
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(0, 0, W, H);

    // Perspectiva — paredes laterales (trapecios)
    // Pared izquierda
    ctx.fillStyle = '#d0d3d8';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(80, 60);
    ctx.lineTo(80, H - 80); ctx.lineTo(0, H);
    ctx.closePath(); ctx.fill();

    // Pared derecha
    ctx.fillStyle = '#c8cbd0';
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(W - 80, 60);
    ctx.lineTo(W - 80, H - 80); ctx.lineTo(W, H);
    ctx.closePath(); ctx.fill();

    // Techo
    ctx.fillStyle = '#b8bcc4';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    ctx.lineTo(W - 80, 60); ctx.lineTo(80, 60);
    ctx.closePath(); ctx.fill();

    // Piso
    ctx.fillStyle = '#dde0e5';
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(W, H);
    ctx.lineTo(W - 80, H - 80); ctx.lineTo(80, H - 80);
    ctx.closePath(); ctx.fill();

    // ── 2. TEXTURA DE PAREDES ─────────────────────────────
    const wallTexture = await loadImg(wallImg);
    if (wallTexture) {
      // Pared frontal (principal)
      ctx.save();
      ctx.beginPath();
      ctx.rect(80, 60, W - 160, H - 140);
      ctx.clip();
      const pat = ctx.createPattern(wallTexture, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(80, 60, W - 160, H - 140);
        ctx.globalAlpha = 1;
      } else {
        // fallback: color sólido
        ctx.globalAlpha = 0.3;
        ctx.drawImage(wallTexture, 80, 60, W - 160, H - 140);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Pared lateral izquierda — mismo acabado, más oscuro
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(80, 60);
      ctx.lineTo(80, H - 80); ctx.lineTo(0, H);
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(wallTexture, 0, 0, 80, H);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Pared lateral derecha
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W, 0); ctx.lineTo(W - 80, 60);
      ctx.lineTo(W - 80, H - 80); ctx.lineTo(W, H);
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(wallTexture, W - 80, 0, 80, H);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── 3. PLAFÓN ─────────────────────────────────────────
    const plafonTexture = await loadImg(plafonImg);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    ctx.lineTo(W - 80, 60); ctx.lineTo(80, 60);
    ctx.closePath(); ctx.clip();
    if (plafonTexture) {
      ctx.drawImage(plafonTexture, 80, 0, W - 160, 60);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#aaa';
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#c5c8cf';
      ctx.fill();
    }
    ctx.restore();

    // ── 4. PISO ───────────────────────────────────────────
    const floorTexture = await loadImg(floorImg);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(W, H);
    ctx.lineTo(W - 80, H - 80); ctx.lineTo(80, H - 80);
    ctx.closePath(); ctx.clip();
    if (floorTexture) {
      ctx.drawImage(floorTexture, 80, H - 80, W - 160, 80);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#cdd0d6';
      ctx.fill();
    }
    ctx.restore();

    // ── 5. DETALLES ESTRUCTURALES ─────────────────────────
    // Marcos de la cabina (líneas de borde)
    ctx.strokeStyle = 'rgba(50,50,80,0.25)';
    ctx.lineWidth = 2;

    // Borde pared frontal
    ctx.strokeRect(80, 60, W - 160, H - 140);

    // Líneas de esquina
    ctx.beginPath();
    ctx.moveTo(0, 0);   ctx.lineTo(80, 60);
    ctx.moveTo(W, 0);   ctx.lineTo(W - 80, 60);
    ctx.moveTo(0, H);   ctx.lineTo(80, H - 80);
    ctx.moveTo(W, H);   ctx.lineTo(W - 80, H - 80);
    ctx.stroke();

    // ── 6. EXTRAS ─────────────────────────────────────────

    // Espejo trasero
    if (extras.includes('espejo-trasero')) {
      const mx = 100, my = 90, mw = W - 200, mh = (H - 150) * 0.55;
      ctx.save();
      // Marco del espejo
      ctx.strokeStyle = 'rgba(180,180,200,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(mx, my, mw, mh);
      // Reflejo simulado (gradiente)
      const grd = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
      grd.addColorStop(0,   'rgba(255,255,255,0.35)');
      grd.addColorStop(0.4, 'rgba(200,210,230,0.2)');
      grd.addColorStop(1,   'rgba(255,255,255,0.1)');
      ctx.fillStyle = grd;
      ctx.fillRect(mx, my, mw, mh);
      ctx.restore();
    }

    // Espejo lateral izquierdo
    if (extras.includes('espejo-lateral')) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(8, 30); ctx.lineTo(72, 80);
      ctx.lineTo(72, H - 100); ctx.lineTo(8, H - 30);
      ctx.closePath();
      const grd2 = ctx.createLinearGradient(0, 0, 80, 0);
      grd2.addColorStop(0, 'rgba(255,255,255,0.3)');
      grd2.addColorStop(1, 'rgba(200,210,230,0.1)');
      ctx.fillStyle = grd2;
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,180,200,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Pasamanos INOX
    if (extras.includes('pasamanos-inox') || extras.includes('pasamanos-crom')) {
      const color = extras.includes('pasamanos-crom') ? '#c0c0c0' : '#e0e4ea';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      // Pasamanos horizontal en pared trasera
      const py = 60 + (H - 140) * 0.45;
      ctx.beginPath();
      ctx.moveTo(95, py); ctx.lineTo(W - 95, py);
      ctx.stroke();
      // Soporte izquierdo
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(110, py); ctx.lineTo(110, py + 20);
      ctx.moveTo(W - 110, py); ctx.lineTo(W - 110, py + 20);
      ctx.stroke();
      ctx.restore();
    }

    // Botonera (siempre presente)
    ctx.save();
    const bx = W - 135, by = 60 + (H - 140) * 0.3;
    const bw = 32, bh = 90;
    // Caja botonera
    ctx.fillStyle = extras.includes('pasamanos-inox') ? '#d0d4dc' : '#c8ccd4';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,110,130,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pantalla
    ctx.fillStyle = '#1a2440';
    ctx.beginPath();
    ctx.roundRect(bx + 3, by + 4, bw - 6, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PB', bx + bw / 2, by + 14);
    // Botones
    for (let i = 0; i < 4; i++) {
      const btnY = by + 24 + i * 16;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, btnY, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#D4AF37' : '#9ca3af';
      ctx.fill();
    }
    ctx.restore();

    // Iluminación LED premium
    if (extras.includes('led-premium')) {
      // Luz de techo
      const grdLight = ctx.createRadialGradient(W / 2, 50, 0, W / 2, 50, W / 2);
      grdLight.addColorStop(0,   'rgba(255,253,220,0.18)');
      grdLight.addColorStop(0.6, 'rgba(255,253,220,0.06)');
      grdLight.addColorStop(1,   'transparent');
      ctx.fillStyle = grdLight;
      ctx.fillRect(0, 0, W, H);
      // Spots LED en el plafón
      for (let i = 0; i < 3; i++) {
        const lx = 130 + i * 80, ly = 30;
        ctx.save();
        const grdSpot = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30);
        grdSpot.addColorStop(0, 'rgba(255,255,220,0.7)');
        grdSpot.addColorStop(1, 'transparent');
        ctx.fillStyle = grdSpot;
        ctx.fillRect(lx - 30, ly - 10, 60, 40);
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Panel panorámico (indicador visual en pared lateral)
    if (extras.includes('panoramico')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(150,200,255,0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      // Zona panorámica marcada en pared lateral derecha
      ctx.beginPath();
      ctx.moveTo(W - 70, 80); ctx.lineTo(W - 10, 20);
      ctx.lineTo(W - 10, H - 40); ctx.lineTo(W - 70, H - 100);
      ctx.closePath();
      ctx.stroke();
      const grdPan = ctx.createLinearGradient(W - 80, 0, W, 0);
      grdPan.addColorStop(0, 'rgba(180,220,255,0.0)');
      grdPan.addColorStop(1, 'rgba(180,220,255,0.18)');
      ctx.fillStyle = grdPan;
      ctx.fill();
      ctx.restore();
    }

    // ── 7. OVERLAY DE LABELS ──────────────────────────────
    // Etiquetas de configuración en la parte inferior
    ctx.save();
    ctx.fillStyle = 'rgba(10, 22, 40, 0.72)';
    ctx.fillRect(0, H - 58, W, 58);

    ctx.fillStyle = 'rgba(212,175,55,0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✦ CONFIGURACIÓN', 10, H - 44);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '9px sans-serif';
    const wallLabel = wallFinish || 'Estándar';
    const floorLabelShort = (floorLabel || 'Granito').substring(0, 22);
    const extrasList = extras.slice(0, 3).map(e =>
      e === 'espejo-trasero' ? 'Espejo' :
      e === 'pasamanos-inox' ? 'Pasamanos INOX' :
      e === 'led-premium' ? 'LED' :
      e === 'panoramico' ? 'Panorámico' : e
    ).join(' · ');
    ctx.fillText(`${wallLabel}  ·  Piso: ${floorLabelShort}  ·  ${plafonId || 'LV-29'}`, 10, H - 30);
    if (extrasList) ctx.fillText(extrasList, 10, H - 14);
    ctx.restore();

  }, [wallImg, floorImg, plafonImg, extras, wallFinish, floorLabel, plafonId]);

  useEffect(() => { draw(); }, [draw]);

  const handleCapture = async () => {
    setCapturing(true);
    await draw();
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onCapture?.(dataUrl);
      setCaptured(true);
      setTimeout(() => setCaptured(false), 2500);
    }
    setCapturing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{ border: '2px solid rgba(10,36,99,0.12)' }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', maxWidth: W }} />
        {/* Watermark */}
        <div className="absolute bottom-16 right-3 opacity-25 pointer-events-none">
          <p className="text-[8px] font-black text-white uppercase tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            ALAMEX
          </p>
        </div>
      </div>

      {/* Botón capturar */}
      <div className="flex items-center gap-3 w-full">
        <button type="button" onClick={handleCapture} disabled={capturing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: captured ? '#10b981' : '#0A2463',
            color: 'white',
            fontFamily: "'Syne', sans-serif",
          }}>
          {capturing
            ? <><RefreshCw size={15} className="animate-spin" /> Generando...</>
            : captured
            ? <>✓ Imagen capturada para el PDF</>
            : <><Camera size={15} /> Capturar para PDF</>
          }
        </button>
      </div>

      <p className="text-[10px] text-[#0A2463]/40 text-center">
        Vista referencial · Imagen se incluirá en la propuesta
      </p>
    </div>
  );
}
