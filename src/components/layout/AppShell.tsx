// ARCHIVO: src/components/layout/AppShell.tsx
import { type ReactNode } from 'react';
import { LayoutDashboard, Plus, Kanban, LogOut, User } from 'lucide-react';
import type { UserRecord } from '../../types';
import type { View } from '../../App';

interface Props {
  user: UserRecord;
  onLogout: () => void;
  currentView: View;
  onNavigate: (v: View) => void;
  onNewQuote: () => void;
  children: ReactNode;
}

const NAV = [
  { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Cotizaciones' },
  { id: 'pipeline'  as View, icon: Kanban,          label: 'Seguimiento'  },
];

export default function AppShell({ user, onLogout, currentView, onNavigate, onNewQuote, children }: Props) {
  return (
    <div className="h-full flex" style={{ background: 'var(--navy-950)' }}>

      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 flex flex-col py-5 px-3 relative"
        style={{ borderRight: '1px solid var(--border)', background: 'rgba(15,32,64,0.5)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#152A52,#0A1628)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <img src="/images/logo-alamex.png" alt="" className="w-5 h-5 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>ALAMEX</p>
            <p className="text-[10px] tracking-widest mt-0.5 font-medium" style={{ color: 'var(--gold-500)' }}>Cotizador 2.0</p>
          </div>
        </div>

        {/* Nueva cotización CTA */}
        <button onClick={onNewQuote} className="btn-primary w-full justify-center mb-6 py-2.5">
          <Plus size={15} />
          Nueva cotización
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV.map(item => {
            const active = currentView === item.id || (currentView.includes('quote') && item.id === 'dashboard');
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background:  active ? 'var(--surface-2)' : 'transparent',
                  color:       active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border:      active ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
                  fontWeight:  active ? 500 : 400,
                }}>
                <item.icon size={16} style={{ color: active ? 'var(--gold-500)' : 'inherit' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ background: 'var(--surface-1)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--gold-400)' }}>
              {user.name?.charAt(0).toUpperCase() || <User size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name || user.email}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.job_title || 'Ejecutivo'}</p>
            </div>
            <button onClick={onLogout} title="Cerrar sesión"
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color='#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
