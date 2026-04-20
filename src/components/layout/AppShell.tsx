// ARCHIVO: src/components/layout/AppShell.tsx
import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, Plus, Kanban, LogOut, User,
  Shield, ChevronRight, Users, Menu, X,
} from 'lucide-react';
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

export default function AppShell({
  displayName, displayTitle, avatarUrl, isAdmin,
  onLogout, currentView, onNavigate, onNewQuote, children,
}: Props) {

  // Mobile: sidebar abierto/cerrado por hamburguesa
  const [mobileOpen,  setMobileOpen]  = useState(false);
  // Desktop: sidebar expandido por hover
  const [desktopOpen, setDesktopOpen] = useState(false);

  const safeName    = displayName || '';
  const initial     = safeName.charAt(0).toUpperCase();
  const isQuoteView = currentView.includes('quote') || currentView === 'detail';

  const handleNav = (v: View) => {
    setMobileOpen(false);
    onNavigate(v);
  };

  const handleNewQuote = () => {
    setMobileOpen(false);
    onNewQuote();
  };

  const NAV_SECTIONS = [
    {
      label: 'Principal',
      items: [
        { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Panel de Control' },
        { id: 'pipeline'  as View, icon: Kanban,          label: 'Seguimiento'      },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { id: 'profile' as View, icon: User,   label: 'Mi Perfil' },
        ...(isAdmin ? [{ id: 'users' as View, icon: Users, label: 'Usuarios' }] : []),
      ],
    },
  ];

  // ── Sidebar compartido (desktop hover + mobile full) ──────────
  const SidebarContent = ({ expanded }: { expanded: boolean }) => (
    <>
      {/* Botón NUEVA */}
      <div className="p-2 pt-3 shrink-0 relative z-10">
        <button
          onClick={handleNewQuote}
          className="w-full flex items-center justify-center py-3 rounded-2xl font-black transition-all active:scale-95 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
            color: '#051338',
            boxShadow: '0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            fontFamily: "'Syne', sans-serif",
            gap: expanded ? '8px' : '0px',
          }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus size={17} strokeWidth={3} className="shrink-0 relative z-10" />
          <span
            className="relative z-10 text-sm uppercase tracking-widest overflow-hidden whitespace-nowrap transition-all duration-200"
            style={{ maxWidth: expanded ? '120px' : '0px', opacity: expanded ? 1 : 0 }}>
            Nueva
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-3 relative z-10">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {/* Etiqueta de sección — solo visible expandido */}
            <div
              className="overflow-hidden whitespace-nowrap transition-all duration-200 px-2 mb-1"
              style={{ maxHeight: expanded ? '20px' : '0px', opacity: expanded ? 1 : 0 }}>
              <p className="text-[9px] font-black tracking-[0.2em] uppercase"
                style={{ color: 'rgba(212,175,55,0.4)' }}>
                {section.label}
              </p>
            </div>

            {section.items.map(item => {
              const active = currentView === item.id || (isQuoteView && item.id === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={!expanded ? item.label : undefined}
                  className="w-full flex items-center py-2.5 rounded-xl text-xs transition-all mb-0.5"
                  style={{
                    background: active ? 'rgba(212,175,55,0.1)' : 'transparent',
                    border: active ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.45)',
                    fontWeight: active ? 600 : 400,
                    justifyContent: expanded ? 'flex-start' : 'center',
                    gap: expanded ? '10px' : '0px',
                    paddingLeft: expanded ? '10px' : '0px',
                    paddingRight: expanded ? '10px' : '0px',
                  }}>
                  <item.icon
                    size={15}
                    style={{ color: active ? '#D4AF37' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}
                  />
                  <span
                    className="overflow-hidden whitespace-nowrap transition-all duration-200 flex-1 text-left"
                    style={{ maxWidth: expanded ? '160px' : '0px', opacity: expanded ? 1 : 0 }}>
                    {item.label}
                  </span>
                  {active && expanded && (
                    <ChevronRight size={12} style={{ color: 'rgba(212,175,55,0.5)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Version */}
      <div className="px-3 py-3 shrink-0 relative z-10 overflow-hidden"
        style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}>
        <p
          className="text-[9px] font-mono whitespace-nowrap overflow-hidden transition-all duration-200"
          style={{ color: 'rgba(255,255,255,0.2)', opacity: expanded ? 1 : 0 }}>
          2.1.1 | ALAMEX
        </p>
        {!expanded && (
          <div className="w-4 h-0.5 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.1)' }} />
        )}
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: '#F9F7F2' }}>

      {/* ══ HEADER ══ */}
      <header
        className="h-16 md:h-20 shrink-0 flex items-center px-4 md:px-8 relative z-40 overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #051338, #0A2463, #051338)',
          borderBottom: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}>

        <div className="absolute inset-0 arabesque-pattern pointer-events-none opacity-20" />

        {/* LEFT: Logo */}
        <div
          className="flex items-center gap-3 md:gap-5 cursor-pointer group z-10"
          onClick={() => handleNav('dashboard')}>
          <div className="relative">
            <div className="absolute -inset-2 bg-[#D4AF37] rounded-full blur-md opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="bg-black/20 backdrop-blur-md p-2 md:p-2.5 rounded-xl shadow-inner border border-white/10 relative transform group-hover:scale-105 transition-transform duration-300">
              <img
                src="/images/logo-alamex.png" alt="Logo"
                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black text-white tracking-tight leading-none drop-shadow-md"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              ALAMEX
            </span>
            <span className="hidden md:block text-[9px] text-[#D4AF37] font-bold tracking-[0.3em] uppercase mt-1"
              style={{ textShadow: '0 0 10px rgba(212,175,55,0.5)' }}>
              Ascending Together
            </span>
          </div>
        </div>

        {/* CENTER: Título desktop */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex flex-col items-center z-10">
          <h2 className="text-xl font-black text-white tracking-[0.15em] uppercase flex items-center gap-4"
            style={{ fontFamily: "'Syne', sans-serif", textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
            <span className="text-[#D4AF37] opacity-80">✦</span>
            Cotizador Interno
            <span className="text-[#D4AF37] opacity-80">✦</span>
          </h2>
          <div className="w-40 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-1.5" />
        </div>

        {/* RIGHT */}
        <div className="ml-auto flex items-center gap-2 md:gap-5 z-10">
          {isAdmin && (
            <button onClick={() => handleNav('users')}
              className={`hidden md:flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-bold transition-all
                ${currentView === 'users'
                  ? 'bg-[#D4AF37] text-[#0A2463] border-[#D4AF37]'
                  : 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A2463]'}`}>
              <Shield size={13} /> Usuarios
            </button>
          )}

          <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-5 border-l border-white/10">
            <button onClick={() => handleNav('profile')} className="text-right hidden md:block group">
              <p className="text-white font-bold text-sm leading-tight group-hover:text-[#D4AF37] transition-colors">
                {safeName || 'Usuario'}
              </p>
              <p className="text-[#D4AF37] text-[10px] font-medium uppercase tracking-wider opacity-80">
                {displayTitle || 'Ejecutivo'}
              </p>
            </button>

            <button onClick={() => handleNav('profile')}
              className="relative w-9 h-9 rounded-full bg-black/30 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] overflow-hidden backdrop-blur-sm hover:border-[#D4AF37] hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all">
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                : <span className="text-sm font-black">{initial || <User size={14} />}</span>}
            </button>

            <button onClick={onLogout}
              className="text-white/40 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-full"
              title="Cerrar sesión">
              <LogOut size={17} />
            </button>

            {/* Hamburguesa — solo mobile */}
            <button onClick={() => setMobileOpen(s => !s)}
              className="md:hidden p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Overlay mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── SIDEBAR MOBILE: overlay fijo, abierto/cerrado con hamburguesa ── */}
        <aside
          className={`
            fixed md:hidden top-0 left-0 h-full z-50 w-[220px]
            flex flex-col overflow-hidden
            transition-transform duration-300 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{
            background: 'linear-gradient(180deg, #0A1830 0%, #060E1C 100%)',
            borderRight: '1px solid rgba(212,175,55,0.15)',
          }}>
          <div className="absolute inset-0 arabesque-pattern opacity-10 pointer-events-none" />

          {/* Cerrar */}
          <div className="flex justify-end px-3 pt-3 relative z-10">
            <button onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>

          <SidebarContent expanded={true} />
        </aside>

        {/* ── SIDEBAR DESKTOP: hover para expandir ── */}
        <aside
          className="hidden md:flex flex-col overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out relative"
          style={{
            width: desktopOpen ? '220px' : '56px',
            background: 'linear-gradient(180deg, #0A1830 0%, #060E1C 100%)',
            borderRight: desktopOpen
              ? '1px solid rgba(212,175,55,0.2)'
              : '1px solid rgba(212,175,55,0.08)',
            boxShadow: desktopOpen ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
          }}
          onMouseEnter={() => setDesktopOpen(true)}
          onMouseLeave={() => setDesktopOpen(false)}>

          <div className="absolute inset-0 arabesque-pattern opacity-10 pointer-events-none" />

          {/* Indicador visual "expandible" cuando está colapsado */}
          {!desktopOpen && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 rounded-l-full opacity-30"
              style={{ background: 'rgba(212,175,55,0.6)' }} />
          )}

          <SidebarContent expanded={desktopOpen} />
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
