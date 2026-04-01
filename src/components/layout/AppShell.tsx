// ARCHIVO: src/components/layout/AppShell.tsx
// Estilo 1:1 del original — header navy, sidebar oscuro con secciones,
// fondo beige #F9F7F2, arabesque, ambient light
import { type ReactNode } from 'react';
import { LayoutDashboard, Plus, Kanban, LogOut, User, Shield, ChevronRight } from 'lucide-react';
import type { View } from '../../App';

interface Props {
  displayName:  string;
  displayTitle: string;
  avatarUrl:    string | null;
  isAdmin?:     boolean;
  onLogout:     () => void;
  currentView:  View;
  onNavigate:   (v: View) => void;
  onNewQuote:   () => void;
  children:     ReactNode;
}

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Panel de Control' },
      { id: 'pipeline'  as View, icon: Kanban,          label: 'Seguimiento'      },
    ],
  },
];

export default function AppShell({
  displayName, displayTitle, avatarUrl, isAdmin,
  onLogout, currentView, onNavigate, onNewQuote, children,
}: Props) {

  const safeName    = displayName || '';
  const initial     = safeName.charAt(0).toUpperCase();
  const isQuoteView = currentView.includes('quote') || currentView === 'detail';

  return (
    <div className="h-full flex flex-col" style={{ background: '#F9F7F2' }}>

      {/* ══ HEADER — idéntico al original ══ */}
      <header className="h-28 shrink-0 flex items-center px-8 relative z-40 overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #051338, #0A2463, #051338)',
          borderBottom: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}>

        {/* Arabesque en header */}
        <div className="absolute inset-0 arabesque-pattern pointer-events-none opacity-20" />

        {/* LEFT: Logo + ALAMEX */}
        <div className="flex items-center gap-6 cursor-pointer group z-10" onClick={() => onNavigate('dashboard')}>
          <div className="relative">
            <div className="absolute -inset-2 bg-[#D4AF37] rounded-full blur-md opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl shadow-inner border border-white/10 relative transform group-hover:scale-105 transition-transform duration-300">
              <img src="/images/logo-alamex.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-white tracking-tight leading-none drop-shadow-md"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              ALAMEX
            </span>
            <span className="text-[10px] text-[#D4AF37] font-bold tracking-[0.3em] uppercase mt-1.5"
              style={{ textShadow: '0 0 10px rgba(212,175,55,0.5)' }}>
              Ascending Together
            </span>
          </div>
        </div>

        {/* CENTER: Título */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex flex-col items-center z-10">
          <h2 className="text-2xl font-black text-white tracking-[0.15em] uppercase flex items-center gap-4"
            style={{ fontFamily: "'Syne', sans-serif", textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
            <span className="text-[#D4AF37] opacity-80 text-xl">✦</span>
            Cotizador Interno
            <span className="text-[#D4AF37] opacity-80 text-xl">✦</span>
          </h2>
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-2" />
        </div>

        {/* RIGHT: Admin + user + logout */}
        <div className="ml-auto flex items-center gap-6 z-10">
          {isAdmin && (
            <button className="hidden md:flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#D4AF37] hover:text-[#0A2463] transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <Shield size={14} /> Admin
            </button>
          )}
          <div className="flex items-center gap-4 pl-6 border-l border-white/10">
            <div className="text-right hidden md:block cursor-pointer" onClick={() => {}}>
              <p className="text-white font-bold text-sm leading-tight">{safeName || 'Usuario'}</p>
              <p className="text-[#D4AF37] text-[10px] font-medium uppercase tracking-wider opacity-80">
                {displayTitle || 'Ejecutivo'}
              </p>
            </div>
            <div className="relative w-11 h-11 rounded-full bg-black/30 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] overflow-hidden backdrop-blur-sm shadow-inner">
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                : <span className="text-lg font-black">{initial || <User size={16} />}</span>
              }
            </div>
            <button onClick={onLogout} className="text-white/40 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-full" title="Salir">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── SIDEBAR — idéntico al original ── */}
        <aside className="w-[220px] shrink-0 flex flex-col relative overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #0A1830 0%, #060E1C 100%)', borderRight: '1px solid rgba(212,175,55,0.1)' }}>

          {/* Arabesque en sidebar */}
          <div className="absolute inset-0 arabesque-pattern opacity-10 pointer-events-none" />

          {/* Botón NUEVA */}
          <div className="p-3 pt-4 shrink-0 relative z-10">
            <button onClick={onNewQuote}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #FBBF24)', color: '#051338', boxShadow: '0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', fontFamily: "'Syne', sans-serif" }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Plus size={16} strokeWidth={3} />
              <span className="relative z-10">Nueva</span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4 relative z-10">
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p className="text-[9px] font-black tracking-[0.2em] uppercase px-3 mb-1.5"
                  style={{ color: 'rgba(212,175,55,0.4)' }}>
                  {section.label}
                </p>
                {section.items.map(item => {
                  const active = currentView === item.id || (isQuoteView && item.id === 'dashboard');
                  return (
                    <button key={item.id} onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all mb-0.5 group"
                      style={{
                        background: active ? 'rgba(212,175,55,0.1)' : 'transparent',
                        border: active ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                        color: active ? 'white' : 'rgba(255,255,255,0.45)',
                        fontWeight: active ? 600 : 400,
                      }}>
                      <item.icon size={15} style={{ color: active ? '#D4AF37' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {active && <ChevronRight size={12} style={{ color: 'rgba(212,175,55,0.5)' }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Version */}
          <div className="px-4 py-3 shrink-0 relative z-10" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}>
            <p className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>2.0.0 | ALAMEX</p>
          </div>
        </aside>

        {/* ── CONTENIDO ── */}
        <main className="flex-1 overflow-hidden flex flex-col relative" style={{ background: '#F9F7F2' }}>
          <div className="absolute inset-0 arabesque-pattern pointer-events-none z-0 opacity-30" />
          <div className="ambient-light-bg opacity-40" />
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
