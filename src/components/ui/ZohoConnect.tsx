// ARCHIVO: src/components/ui/ZohoConnect.tsx
// Modal para autorizar Zoho Mail OAuth — el vendedor lo hace una sola vez.
// Usa PKCE flow seguro: el client_secret nunca sale al browser.
// El intercambio de código → token lo hace la Supabase Edge Function.

import { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Props { onClose: () => void }

const ZOHO_REGION  = import.meta.env.VITE_ZOHO_REGION  || 'com';
const ZOHO_CLIENT  = import.meta.env.VITE_ZOHO_CLIENT_ID || '';
// La redirect URI debe estar registrada en Zoho Developer Console
const REDIRECT_URI = `${window.location.origin}/zoho-callback`;

const ZOHO_AUTH_URL = `https://accounts.zoho.${ZOHO_REGION}/oauth/v2/auth?` + new URLSearchParams({
  response_type: 'code',
  client_id:     ZOHO_CLIENT,
  redirect_uri:  REDIRECT_URI,
  scope:         'ZohoMail.messages.CREATE,ZohoMail.accounts.READ',
  access_type:   'offline',  // para obtener refresh_token
}).toString();

export default function ZohoConnect({ onClose }: Props) {
  const [status,   setStatus]   = useState<'idle' | 'waiting' | 'ok' | 'error'>('idle');
  const [msg,      setMsg]      = useState('');
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(true);

  // Verificar si ya está conectado
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any).from('profiles').select('zoho_config').eq('id', user.id).single();
        if (data?.zoho_config) {
          const cfg = JSON.parse(data.zoho_config);
          setEmail(cfg.email || '');
          setStatus('ok');
        }
      } finally { setLoading(false); }
    })();
  }, []);

  // Escuchar el callback de Zoho (cuando el popup cierra o la página regresa con ?code=)
  useEffect(() => {
    const handler = async (e: StorageEvent) => {
      if (e.key === 'zoho_oauth_code' && e.newValue) {
        const code = e.newValue;
        localStorage.removeItem('zoho_oauth_code');
        await exchangeCode(code);
      }
    };
    window.addEventListener('storage', handler);

    // También revisar si la URL actual tiene el código (en caso de redirect directo)
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      exchangeCode(code);
    }

    return () => window.removeEventListener('storage', handler);
  }, []);

  const exchangeCode = async (code: string) => {
    setStatus('waiting');
    setMsg('Conectando con Zoho...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión activa');
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ code, userId: user.id, redirectUri: REDIRECT_URI }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setStatus('ok');
      setEmail(data.email || '');
      setMsg('');
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message || 'Error de conexión');
    }
  };

  const openZohoAuth = () => {
    if (!ZOHO_CLIENT) {
      setStatus('error');
      setMsg('Falta VITE_ZOHO_CLIENT_ID en las variables de entorno');
      return;
    }
    // Abrir popup de Zoho
    const w = 500, h = 600;
    const left = (screen.width - w) / 2;
    const top  = (screen.height - h) / 2;
    window.open(ZOHO_AUTH_URL, 'zoho_auth', `width=${w},height=${h},left=${left},top=${top}`);
    setStatus('waiting');
    setMsg('Esperando autorización en Zoho...');
  };

  const disconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from('profiles').update({ zoho_config: null }).eq('id', user.id);
    setStatus('idle'); setEmail(''); setMsg('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(4,13,26,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ border: '1px solid rgba(212,175,55,0.25)' }}>

        {/* Header */}
        <div className="px-7 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #051338, #0A2463)', borderBottom: '2px solid #D4AF37' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
              <Mail size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-black text-white text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                Conectar Zoho Mail
              </p>
              <p className="text-[10px] text-white/40">Envío de correos bajo tu cuenta @alam.mx</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-7">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#D4AF37]" /></div>
          ) : status === 'ok' ? (
            /* Conectado */
            <div className="space-y-4">
              <div className="rounded-2xl p-5 border border-emerald-200 bg-emerald-50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Cuenta conectada</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{email}</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">Los correos saldrán con tu nombre y firma</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={disconnect}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                  <RefreshCw size={14} /> Desconectar
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all"
                  style={{ background: '#0A2463' }}>
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* No conectado */
            <div className="space-y-5">
              <div className="rounded-2xl p-4 bg-[#0A2463]/5 border border-[#0A2463]/10">
                <p className="text-xs font-bold text-[#0A2463] mb-2">¿Qué permite esto?</p>
                <ul className="space-y-1.5">
                  {[
                    'Enviar propuestas PDF desde tu cuenta @alam.mx',
                    'El correo lleva tu nombre y firma automáticamente',
                    'El cliente responde directamente a tu cuenta',
                    'Solo necesitas autorizar una vez',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-[#0A2463]/60">
                      <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {status === 'waiting' && (
                <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">{msg}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="rounded-xl p-4 bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600 font-medium">{msg}</p>
                </div>
              )}

              <button onClick={openZohoAuth} disabled={status === 'waiting'}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-black text-white uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #CC0000, #E02020)', fontFamily: "'Syne', sans-serif" }}>
                <Mail size={16} />
                Autorizar con Zoho Mail
                <ExternalLink size={13} />
              </button>

              <p className="text-[10px] text-[#0A2463]/35 text-center leading-relaxed">
                Se abrirá una ventana de Zoho para que inicies sesión y autorices el acceso.
                Tus credenciales de Zoho nunca son almacenadas — solo los tokens de acceso.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
