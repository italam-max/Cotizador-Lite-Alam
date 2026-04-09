// ARCHIVO: src/components/ui/CabinConfigurator.tsx
// v7 — drawImage estirado en todas las superficies, sin mosaico

import { useRef, useEffect, useCallback, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

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

// Geometría — pared frontal grande, laterales visibles, piso amplio
const FL  = { x: 112, y: 88  };
const FR  = { x: 348, y: 88  };
const FBL = { x: 112, y: 408 };
const FBR = { x: 348, y: 408 };
const LL  = { x: 14,  y: 30  };
const LLB = { x: 14,  y: 462 };
const RL  = { x: 446, y: 30  };
const RLB = { x: 446, y: 462 };

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
    (ctx as any).imageSmoothingQuality = 'high';

    const [wallTex, floorTex, plafonTex] = await Promise.all([
      loadImg(wallImg), loadImg(floorImg), loadImg(plafonImg),
    ]);

    // ── 1. FONDO ─────────────────────────────────────────────
    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, 0, W, H);

    // ── Helpers de path ──────────────────────────────────────
    const pathLeft = () => {
      ctx.beginPath();
      ctx.moveTo(LL.x,  LL.y);  ctx.lineTo(FL.x,  FL.y);
      ctx.lineTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
      ctx.closePath();
    };
    const pathRight = () => {
      ctx.beginPath();
      ctx.moveTo(FR.x,  FR.y);  ctx.lineTo(RL.x,  RL.y);
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
      ctx.moveTo(LL.x, LL.y); ctx.lineTo(RL.x, RL.y);
      ctx.lineTo(FR.x, FL.y); ctx.lineTo(FL.x, FL.y);
      ctx.closePath();
    };

    // ── 2. PARED LATERAL IZQUIERDA ───────────────────────────
    ctx.save();
    pathLeft(); ctx.clip();
    // Base oscura
    ctx.fillStyle = '#12151e'; ctx.fillRect(0, 0, W, H);
    if (wallTex) {
      // Imagen estirada en el bounding box del trapecio
      ctx.globalAlpha = 0.50;
      ctx.drawImage(wallTex, LL.x, LL.y, FL.x - LL.x, LLB.y - LL.y);
      ctx.globalAlpha = 1;
    }
    // Sombra de perspectiva — hace que la pared se vea en ángulo
    const lGrad = ctx.createLinearGradient(LL.x, 0, FL.x, 0);
    lGrad.addColorStop(0, 'rgba(0,0,0,0.75)');
    lGrad.addColorStop(0.5, 'rgba(0,0,0,0.48)');
    lGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    pathLeft(); ctx.fillStyle = lGrad; ctx.fill();
    // Highlight sutil en la arista frontal
    const lEdge = ctx.createLinearGradient(FL.x - 18, 0, FL.x, 0);
    lEdge.addColorStop(0, 'rgba(255,255,255,0)');
    lEdge.addColorStop(1, 'rgba(255,255,255,0.08)');
    pathLeft(); ctx.fillStyle = lEdge; ctx.fill();
    ctx.restore();

    // ── 3. PARED LATERAL DERECHA ─────────────────────────────
    ctx.save();
    pathRight(); ctx.clip();
    ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, W, H);
    if (wallTex) {
      ctx.globalAlpha = 0.50;
      ctx.drawImage(wallTex, FR.x, FR.y, RL.x - FR.x, RLB.y - FR.y);
      ctx.globalAlpha = 1;
    }
    const rGrad = ctx.createLinearGradient(FR.x, 0, RL.x, 0);
    rGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
    rGrad.addColorStop(0.5, 'rgba(0,0,0,0.48)');
    rGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
    pathRight(); ctx.fillStyle = rGrad; ctx.fill();
    const rEdge = ctx.createLinearGradient(FR.x, 0, FR.x + 18, 0);
    rEdge.addColorStop(0, 'rgba(255,255,255,0.08)');
    rEdge.addColorStop(1, 'rgba(255,255,255,0)');
    pathRight(); ctx.fillStyle = rEdge; ctx.fill();
    ctx.restore();

    // ── 4. PARED FRONTAL ─────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
    ctx.clip();
    if (wallTex) {
      ctx.globalAlpha = 0.92;
      ctx.drawImage(wallTex, FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#2a3040';
      ctx.fillRect(FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
    }
    // Iluminación central suave — simula luz del plafón
    const wLight = ctx.createRadialGradient(W/2, FL.y - 30, 20, W/2, FL.y + 60, 260);
    wLight.addColorStop(0,   'rgba(255,255,255,0.09)');
    wLight.addColorStop(0.45,'rgba(255,255,255,0.02)');
    wLight.addColorStop(1,   'rgba(0,0,0,0.18)');
    ctx.fillStyle = wLight;
    ctx.fillRect(FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
    ctx.restore();

    // ── 5. TECHO / PLAFÓN ────────────────────────────────────
    ctx.save();
    pathCeil(); ctx.clip();
    if (plafonTex) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(plafonTex, LL.x, LL.y, RL.x - LL.x, FL.y - LL.y + 12);
      ctx.globalAlpha = 1;
    }
    // Luz del techo
    const cLight = ctx.createLinearGradient(W/2, LL.y, W/2, FL.y);
    cLight.addColorStop(0, 'rgba(255,255,255,0.28)');
    cLight.addColorStop(1, 'rgba(200,210,230,0.08)');
    pathCeil(); ctx.fillStyle = cLight; ctx.fill();
    ctx.restore();

    // ── 6. PISO ───────────────────────────────────────────────
    ctx.save();
    pathFloor(); ctx.clip();

    if (floorTex) {
      // Dibujar el piso en franjas para perspectiva — pero con drawImage no pattern
      const flH = LLB.y - FBL.y;
      const numS = 20;
      for (let i = 0; i < numS; i++) {
        const t0 = i / numS, t1 = (i + 1) / numS;
        const y0 = FBL.y + t0 * flH, y1 = FBL.y + t1 * flH;
        const x0L = FBL.x + (LLB.x - FBL.x) * t0, x0R = FBR.x + (RLB.x - FBR.x) * t0;
        const x1L = FBL.x + (LLB.x - FBL.x) * t1, x1R = FBR.x + (RLB.x - FBR.x) * t1;
        const midX = (x0L + x0R) / 2, stripeW = x0R - x0L;
        const stripeH = y1 - y0 + 1;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0L, y0); ctx.lineTo(x0R, y0);
        ctx.lineTo(x1R, y1+1); ctx.lineTo(x1L, y1+1);
        ctx.closePath(); ctx.clip();

        // Escalar porción de la textura para esta franja
        // Tomamos una sección de la imagen fuente proporcional a la posición
        const srcY = Math.floor(t0 * floorTex.naturalHeight);
        const srcH = Math.max(1, Math.floor((t1 - t0) * floorTex.naturalHeight));
        ctx.globalAlpha = 0.90;
        ctx.drawImage(
          floorTex,
          0, srcY, floorTex.naturalWidth, srcH,  // fuente: franja de la imagen
          x0L, y0, stripeW, stripeH               // destino: franja del canvas
        );
        ctx.globalAlpha = 1;

        // Oscurecer hacia el fondo
        ctx.fillStyle = `rgba(0,0,0,${0.05 + t0 * 0.55})`;
        ctx.fillRect(x0L - 2, y0, stripeW + 4, stripeH + 1);
        ctx.restore();
      }
      // Reflejo especular
      const rfl = ctx.createLinearGradient(W/2, FBL.y, W/2, LLB.y);
      rfl.addColorStop(0,   'rgba(255,255,255,0.12)');
      rfl.addColorStop(0.3, 'rgba(255,255,255,0.03)');
      rfl.addColorStop(1,   'rgba(0,0,0,0)');
      pathFloor(); ctx.fillStyle = rfl; ctx.fill();
    } else {
      const fg = ctx.createLinearGradient(W/2, FBL.y, W/2, LLB.y);
      fg.addColorStop(0, '#3a3e50'); fg.addColorStop(1, '#1c1f28');
      ctx.fillStyle = fg; ctx.fill();
    }
    ctx.restore();

    // ── 7. BORDES ─────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(FL.x, FL.y, FR.x - FL.x, FBL.y - FL.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FL.x, FL.y);   ctx.lineTo(LL.x,  LL.y);
    ctx.moveTo(FR.x, FR.y);   ctx.lineTo(RL.x,  RL.y);
    ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
    ctx.moveTo(FBR.x, FBR.y); ctx.lineTo(RLB.x, RLB.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(FL.x, FBL.y); ctx.lineTo(FR.x, FBR.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,0.18)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(LLB.x, LLB.y);
    ctx.moveTo(FBR.x, FBR.y); ctx.lineTo(RLB.x, RLB.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,0.20)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(FL.x, FL.y); ctx.lineTo(FR.x, FR.y); ctx.stroke();
    ctx.restore();

    // ── 8. EXTRAS ────────────────────────────────────────────
    if (extras.includes('espejo-trasero')) {
      const mx=FL.x+16, my=FL.y+18, mw=(FR.x-FL.x)-32, mh=(FBL.y-FL.y)*0.50;
      ctx.save();
      ctx.strokeStyle='rgba(210,215,225,0.75)'; ctx.lineWidth=3;
      ctx.strokeRect(mx,my,mw,mh);
      ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1;
      ctx.strokeRect(mx+3,my+3,mw-6,mh-6);
      const mg=ctx.createLinearGradient(mx,my,mx+mw*0.7,my+mh);
      mg.addColorStop(0,'rgba(255,255,255,0.22)'); mg.addColorStop(0.35,'rgba(200,215,240,0.10)');
      mg.addColorStop(0.7,'rgba(255,255,255,0.05)'); mg.addColorStop(1,'rgba(180,195,220,0.13)');
      ctx.fillStyle=mg; ctx.fillRect(mx,my,mw,mh);
      ctx.save(); ctx.rect(mx,my,mw,mh); ctx.clip();
      ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=14;
      ctx.beginPath(); ctx.moveTo(mx+mw*0.12,my); ctx.lineTo(mx,my+mh*0.3); ctx.stroke();
      ctx.restore(); ctx.restore();
    }

    if (extras.includes('espejo-lateral')) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(LL.x+5,LL.y+20); ctx.lineTo(FL.x-3,FL.y+20);
      ctx.lineTo(FBL.x-3,FBL.y-20); ctx.lineTo(LLB.x+5,LLB.y-30);
      ctx.closePath(); ctx.clip();
      const lg=ctx.createLinearGradient(LL.x,0,FL.x,0);
      lg.addColorStop(0,'rgba(255,255,255,0.03)');
      lg.addColorStop(0.5,'rgba(220,230,255,0.16)');
      lg.addColorStop(1,'rgba(255,255,255,0.05)');
      ctx.fillStyle=lg; ctx.fill();
      ctx.strokeStyle='rgba(200,208,220,0.45)'; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();
    }

    if (extras.includes('pasamanos-inox') || extras.includes('pasamanos-crom')) {
      const isCrom=extras.includes('pasamanos-crom');
      const py=FL.y+(FBL.y-FL.y)*0.46;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=7; ctx.shadowOffsetY=4;
      const rg=ctx.createLinearGradient(0,py-6,0,py+7);
      if(isCrom){rg.addColorStop(0,'#f2f2f4');rg.addColorStop(0.35,'#bbbbbf');rg.addColorStop(0.65,'#e4e4e8');rg.addColorStop(1,'#9a9a9e');}
      else{rg.addColorStop(0,'#eaecf0');rg.addColorStop(0.35,'#a8aeba');rg.addColorStop(0.65,'#d8dce6');rg.addColorStop(1,'#868c9a');}
      ctx.strokeStyle=rg; ctx.lineWidth=10; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(FL.x+10,py); ctx.lineTo(FR.x-10,py); ctx.stroke();
      ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(FL.x+12,py-2.5); ctx.lineTo(FR.x-12,py-2.5); ctx.stroke();
      [0.18,0.50,0.82].forEach(t=>{
        const sx=FL.x+(FR.x-FL.x)*t;
        ctx.shadowBlur=3; ctx.strokeStyle=isCrom?'#aaaab0':'#a0a8b4';
        ctx.lineWidth=5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(sx,py+5); ctx.lineTo(sx,py+24); ctx.stroke();
      });
      ctx.restore();
    }

    // ── 9. BOTONERA ──────────────────────────────────────────
    {
      const bx=FR.x-52, by=FL.y+(FBL.y-FL.y)*0.26, bw=38, bh=112;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.65)'; ctx.shadowBlur=16; ctx.shadowOffsetX=-5; ctx.shadowOffsetY=6;
      const bodyG=ctx.createLinearGradient(bx,0,bx+bw,0);
      bodyG.addColorStop(0,'#191d28'); bodyG.addColorStop(0.5,'#232736'); bodyG.addColorStop(1,'#191d28');
      ctx.fillStyle=bodyG;
      ctx.beginPath();
      if((ctx as any).roundRect)(ctx as any).roundRect(bx,by,bw,bh,5); else ctx.rect(bx,by,bw,bh);
      ctx.fill(); ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
      const brdG=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
      brdG.addColorStop(0,'#485060'); brdG.addColorStop(1,'#282e3e');
      ctx.strokeStyle=brdG; ctx.lineWidth=1.2; ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bx+1.5,by+6); ctx.lineTo(bx+1.5,by+bh-6); ctx.stroke();
      // Pantalla
      const sx=bx+4,sy=by+5,sw=bw-8,sh=22;
      ctx.fillStyle='#050e1a';
      ctx.beginPath();
      if((ctx as any).roundRect)(ctx as any).roundRect(sx,sy,sw,sh,3); else ctx.rect(sx,sy,sw,sh);
      ctx.fill();
      const scrG=ctx.createLinearGradient(sx,sy,sx,sy+sh);
      scrG.addColorStop(0,'rgba(79,195,247,0.18)'); scrG.addColorStop(1,'rgba(30,80,180,0.08)');
      ctx.fillStyle=scrG; ctx.fill();
      ctx.strokeStyle='rgba(79,195,247,0.28)'; ctx.lineWidth=0.8; ctx.stroke();
      ctx.fillStyle='#4fc3f7'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
      ctx.shadowColor='rgba(79,195,247,0.7)'; ctx.shadowBlur=5;
      ctx.fillText('PB',bx+bw/2,sy+15); ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(bx+5,sy+sh+3); ctx.lineTo(bx+bw-5,sy+sh+3); ctx.stroke();
      [{color:'#c8a820',label:'▲',glow:'rgba(212,175,55,0.7)'},{color:'#3a6ed8',label:'3',glow:'rgba(58,110,216,0.5)'},{color:'#4a5060',label:'2',glow:'rgba(74,80,96,0.4)'},{color:'#4a5060',label:'1',glow:'rgba(74,80,96,0.4)'},{color:'#c0341a',label:'⚠',glow:'rgba(192,52,26,0.6)'}].forEach((btn,i)=>{
        const btnY=by+35+i*15,btnX=bx+bw/2;
        ctx.shadowColor=btn.glow; ctx.shadowBlur=7; ctx.shadowOffsetY=2;
        const bG=ctx.createRadialGradient(btnX-1.5,btnY-1.5,0,btnX,btnY,5.5);
        bG.addColorStop(0,lighten(btn.color,35)); bG.addColorStop(1,btn.color);
        ctx.fillStyle=bG; ctx.beginPath(); ctx.arc(btnX,btnY,5.5,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; ctx.shadowOffsetY=0;
        ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(btnX-1.2,btnY-1.5,2.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.font='bold 6px sans-serif'; ctx.textAlign='center'; ctx.fillText(btn.label,btnX,btnY+2.2);
      });
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(bx+bw/2,by+bh-9,4.5,2.8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(160,170,190,0.35)'; ctx.lineWidth=0.8; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='5px sans-serif'; ctx.textAlign='center'; ctx.fillText('COP',bx+bw/2,by+bh-18);
      ctx.restore();
    }

    if(extras.includes('led-premium')){
      const ambG=ctx.createRadialGradient(W/2,FL.y+10,0,W/2,FL.y+10,W*0.65);
      ambG.addColorStop(0,'rgba(255,252,220,0.16)'); ambG.addColorStop(0.5,'rgba(255,250,200,0.04)'); ambG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ambG; ctx.fillRect(0,0,W,H);
      [0.22,0.50,0.78].forEach(t=>{
        const sx=FL.x+(FR.x-FL.x)*t,sy=FL.y+5;
        const halo=ctx.createRadialGradient(sx,sy,0,sx,sy,60);
        halo.addColorStop(0,'rgba(255,252,230,0.22)'); halo.addColorStop(0.5,'rgba(255,250,200,0.06)'); halo.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=halo; ctx.fillRect(sx-65,sy-5,130,90);
        ctx.shadowColor='rgba(255,252,220,0.8)'; ctx.shadowBlur=8;
        ctx.fillStyle='#fffff5'; ctx.beginPath(); ctx.arc(sx,sy,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(sx,sy,1.8,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      });
    }

    if(extras.includes('panoramico')){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(RL.x-6,RL.y+12); ctx.lineTo(FR.x+3,FR.y+18); ctx.lineTo(FBR.x+3,FBR.y-18); ctx.lineTo(RLB.x-6,RLB.y-22);
      ctx.closePath(); ctx.clip();
      const pg=ctx.createLinearGradient(FR.x,0,RL.x,0);
      pg.addColorStop(0,'rgba(140,195,255,0.08)'); pg.addColorStop(1,'rgba(175,218,255,0.22)');
      ctx.fillStyle=pg; ctx.fill();
      ctx.strokeStyle='rgba(140,195,255,0.35)'; ctx.lineWidth=2; ctx.setLineDash([5,3]); ctx.stroke();
      ctx.restore();
    }

    // ── 10. ETIQUETA ──────────────────────────────────────────
    ctx.save();
    ctx.fillStyle='rgba(7,10,18,0.90)'; ctx.fillRect(0,H-50,W,50);
    ctx.fillStyle='#D4AF37'; ctx.fillRect(0,H-50,W,1.5);
    ctx.fillStyle='#D4AF37'; ctx.font='bold 8px sans-serif'; ctx.textAlign='left';
    ctx.fillText('✦  CONFIGURACIÓN DE CABINA',14,H-33);
    ctx.fillStyle='rgba(255,255,255,0.68)'; ctx.font='8.5px sans-serif';
    ctx.fillText(`${(wallFinish||'Estándar').substring(0,20)}  ·  Piso: ${(floorLabel||'Estándar').substring(0,22)}  ·  ${plafonId||'LV-29'}`,14,H-18);
    const el=extras.slice(0,5).map(e=>e==='espejo-trasero'?'Espejo':e==='espejo-lateral'?'Esp.Lat':e==='pasamanos-inox'?'Pasam.INOX':e==='pasamanos-crom'?'Pasam.Crom':e==='led-premium'?'LED':e==='panoramico'?'Panorámico':e).join(' · ');
    if(el){ctx.fillStyle='rgba(212,175,55,0.65)';ctx.font='7.5px sans-serif';ctx.fillText(el,14,H-5);}
    ctx.globalAlpha=0.14;ctx.fillStyle='#fff';ctx.textAlign='right';ctx.font='bold 8px sans-serif';ctx.fillText('ALAMEX',W-12,H-5);ctx.globalAlpha=1;
    ctx.restore();

  }, [wallImg, floorImg, plafonImg, extras, wallFinish, floorLabel, plafonId]);

  useEffect(() => { draw(); }, [draw]);

  const handleCapture = async () => {
    setCapturing(true); await draw();
    const canvas = canvasRef.current;
    if (canvas) {
      onCapture?.(canvas.toDataURL('image/jpeg', 0.93));
      setCaptured(true); setTimeout(() => setCaptured(false), 2500);
    }
    setCapturing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(212,175,55,0.18)' }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', maxWidth: W }} />
      </div>
      <button type="button" onClick={handleCapture} disabled={capturing}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        style={{ background: captured?'#10b981':'#0A2463', color:'white', fontFamily:"'Syne',sans-serif" }}>
        {capturing?<><RefreshCw size={15} className="animate-spin"/>Generando...</>:captured?<>✓ Imagen capturada para el PDF</>:<><Camera size={15}/>Capturar para PDF</>}
      </button>
      <p className="text-[10px] text-[#0A2463]/40 text-center">Vista referencial · Imagen se incluirá en la propuesta</p>
    </div>
  );
}

function lighten(hex: string, amt: number): string {
  const n=parseInt(hex.replace('#',''),16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xff)+amt)},${Math.min(255,(n&0xff)+amt)})`;
}
