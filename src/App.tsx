// ARCHIVO: src/App.tsx
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import LoginPage   from './components/auth/LoginPage';
import AppShell    from './components/layout/AppShell';
import Dashboard   from './features/quoter/Dashboard';
import QuoteForm   from './features/quoter/QuoteForm';
import QuoteDetail from './features/quoter/QuoteDetail';
import Pipeline    from './features/pipeline/Pipeline';
import type { Quote } from './types';

export type View = 'dashboard' | 'new-quote' | 'edit-quote' | 'detail' | 'pipeline';

export default function App() {
  const { user, profile, loading, isLoggedIn, login, logout } = useAuth();
  const [view, setView]               = useState<View>('dashboard');
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  const refresh   = () => setRefreshKey(k => k + 1);
  const openNew   = () => { setActiveQuote(null); setView('new-quote'); };
  const openEdit  = (q: Quote) => { setActiveQuote(q); setView('edit-quote'); };
  const openDetail = (q: Quote) => { setActiveQuote(q); setView('detail'); };
  const goBack    = () => { setView('dashboard'); refresh(); };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--navy-950)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--gold-500)' }} />
      </div>
    );
  }

  if (!isLoggedIn) return <LoginPage onLogin={login} />;

  // Nombre a mostrar: perfil > metadata de Supabase > email
  // Fallback seguro — el perfil puede tardar en cargar
  const displayName  = profile?.full_name
    ?? (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email
    ?? '';
  const displayTitle = profile?.job_title ?? 'Ejecutivo';

  return (
    <AppShell
      displayName={displayName}
      displayTitle={displayTitle}
      avatarUrl={profile?.avatar_url ?? null}
      isAdmin={profile?.role === 'admin'}
      onLogout={logout}
      currentView={view}
      onNavigate={setView}
      onNewQuote={openNew}
    >
      {view === 'dashboard' && (
        <Dashboard key={refreshKey} onNewQuote={openNew} onEditQuote={openEdit} onOpenDetail={openDetail} />
      )}
      {view === 'new-quote' && (
        <QuoteForm quote={null} sellerName={displayName} sellerTitle={displayTitle} onSaved={goBack} onCancel={goBack} />
      )}
      {view === 'edit-quote' && activeQuote && (
        <QuoteForm quote={activeQuote} sellerName={displayName} sellerTitle={displayTitle} onSaved={goBack} onCancel={goBack} />
      )}
      {view === 'detail' && activeQuote && (
        <QuoteDetail quote={activeQuote} sellerName={displayName} sellerTitle={displayTitle}
          onBack={goBack} onEdit={() => openEdit(activeQuote)} onStatusChanged={refresh} />
      )}
      {view === 'pipeline' && (
        <Pipeline key={refreshKey} onOpenDetail={openDetail} />
      )}
    </AppShell>
  );
}
