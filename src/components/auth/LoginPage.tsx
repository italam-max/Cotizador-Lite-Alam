// ARCHIVO: src/components/auth/LoginPage.tsx
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface Props { onLogin: (email: string, password: string) => Promise<void> }

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setError(''); setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err?.message?.includes('400') || err?.message?.toLowerCase().includes('invalid')
        ? 'Email o contraseña incorrectos'
        : 'Error de conexión. Verifica tu internet.');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--navy-950)' }}>

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #1B3564 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #D4AF37 0%, transparent 70%)' }} />

      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="w-full max-w-[380px] px-6 animate-slide-up relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{ background: 'linear-gradient(135deg, #152A52, #0A1628)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 40px rgba(212,175,55,0.08)' }}>
            <img src="/images/logo-alamex.png" alt="Alamex" className="w-10 h-10 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 className="font-display font-800 text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>ALAMEX</h1>
          <p className="text-xs tracking-[0.25em] uppercase mt-1.5 font-medium" style={{ color: 'var(--gold-500)' }}>
            Cotizador 2.0
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 glass" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
          <h2 className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Iniciar sesión</h2>
          <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>Acceso exclusivo para el equipo Alamex</p>

          {error && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@alam.mx"
                className={`input-base ${error ? 'input-error' : ''}`}
                autoComplete="email" autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`input-base pr-11 ${error ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6 py-3">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-xs" style={{ color: 'var(--text-muted)' }}>
          Elevadores Alamex S.A. de C.V. · Uso interno
        </p>
      </div>
    </div>
  );
}
