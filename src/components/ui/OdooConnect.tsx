// ARCHIVO: src/components/ui/OdooConnect.tsx
// Modal para que cada vendedor configure sus credenciales de Odoo
// una sola vez. Soporta API Key o usuario/contraseña.

import { useState, useEffect } from 'react';
import { X, Zap, CheckCircle2, Loader2, Key, User, Lock, Globe, Database, Eye, EyeOff } from 'lucide-react';
import { authenticateOdoo, saveOdooCredentials, getOdooCredentials, type OdooConfig } from '../../services/odooService';
import { supabase } from '../../services/supabase';

interface Props {
  onClose: () => void;
}

const INPUT = "w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0A2463] bg-white border border-[#0A2463]/15 outline-none transition-all placeholder-[#0A2463]/25 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15";

export default function OdooConnect({ onClose }: Props) {
  const [mode,      setMode]      = useState<'apikey' | 'password'>('apikey');
  const [url,       setUrl]       = useState('');
  const [db,        setDb]        = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [apiKey,    setApiKey]    = useState('');
  const [uid,       setUid]       = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [showKey,   setShowKey]   = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testMsg,   setTestMsg]   = useState('');
  const [existing,  setExisting]  = useState(false);

  // Cargar config existente
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const cfg = await getOdooCredentials(user.id);
      if (cfg) {
        setUrl(cfg.url || '');
        setDb(cfg.db || '');
        setApiKey(cfg.apiKey || '');
        setUid(String(cfg.uid || ''));
        setEmail(cfg.email || '');
        setMode(cfg.method || 'apikey');
        setExisting(true);
      }
    })();
  }, []);

  const handleTest = async () => {
    setTesting(true); setTestStatus('idle'); setTestMsg('');
    try {
      if (!url || !db) throw new Error('URL y base de datos son requeridos');

      if (mode === 'password') {
        if (!email || !password) throw new Error('Email y contraseña son requeridos');
        const detectedUid = await authenticateOdoo(url, db, email, password);
        setUid(String(detectedUid));
        setTestStatus('ok');
        setTestMsg(`✓ Conectado como UID ${detectedUid}`);
      } else {
        if (!apiKey || !uid) throw new Error('API Key y UID son requeridos');
        // Test con search en res.users
        const res = await fetch(`${url}/web/dataset/call_kw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${uid}:${apiKey}`)}`,
          },
          body: JSON.stringify({
            jsonrpc: '2.0', method: 'call', id: 1,
            params: {
              model: 'res.users', method: 'read',
              args: [[Number(uid)]], kwargs: { fields: ['name', 'email'] },
            },
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.data?.message || 'Error de autenticación');
        const userName = data.result?.[0]?.name || 'Usuario';
        setTestStatus('ok');
        setTestMsg(`✓ Conectado como "${userName}"`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e.message || 'Error de conexión');
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (testStatus !== 'ok') { alert('Prueba la conexión antes de guardar'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      const config: OdooConfig = {
        url:    url.replace(/\/$/, ''),
        db,
        uid:    Number(uid),
        apiKey: mode === 'apikey' ? apiKey : '',
        email:  mode === 'password' ? email : undefined,
        method: mode,
      };
      await saveOdooCredentials(user.id, config);
      alert('✓ Credenciales guardadas correctamente');
      onClose();
    } catch (e: any) {
      alert('Error al guardar: ' + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(4,13,26,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ border: '1px solid rgba(212,175,55,0.25)' }}>

        {/* Header */}
        <div className="px-7 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #051338, #0A2463)', borderBottom: '2px solid #D4AF37' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
              <Zap size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-black text-white text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                Conectar con Odoo CRM
              </p>
              <p className="text-[10px] text-white/40">
                {existing ? 'Actualizar credenciales' : 'Configuración inicial'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-7 space-y-5">

          {/* Selector de modo */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#f1f5f9' }}>
            {[
              { id: 'apikey'   as const, label: '🔑 API Key personal', desc: 'Recomendado' },
              { id: 'password' as const, label: '👤 Usuario + contraseña', desc: '' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: mode === m.id ? '#0A2463' : 'transparent', color: mode === m.id ? 'white' : '#64748b' }}>
                {m.label}
                {m.desc && <span className="ml-1 text-[9px] opacity-60">{m.desc}</span>}
              </button>
            ))}
          </div>

          {/* URL + DB */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Globe size={10} /> URL de Odoo
              </label>
              <input className={INPUT} value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://odoo.alam.mx" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Database size={10} /> Base de datos
              </label>
              <input className={INPUT} value={db} onChange={e => setDb(e.target.value)}
                placeholder="alam_prod" />
            </div>
          </div>

          {/* Credenciales según modo */}
          {mode === 'apikey' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User size={10} /> UID de usuario en Odoo
                </label>
                <input type="number" className={INPUT} value={uid} onChange={e => setUid(e.target.value)}
                  placeholder="2 (ver Settings > Users > tu usuario)" />
                <p className="text-[9px] text-[#0A2463]/35 mt-1">
                  En Odoo: Settings → Users → tu usuario → URL del navegador (uid=X)
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Key size={10} /> API Key personal
                </label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} className={INPUT + ' pr-10'}
                    value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="Generar en: Settings → Technical → API Keys" />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A2463]/30 hover:text-[#0A2463]">
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[9px] text-[#0A2463]/35 mt-1">
                  Odoo: Settings → Technical → API Keys → New → copia la clave
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User size={10} /> Email de Odoo
                </label>
                <input type="email" className={INPUT} value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@alam.mx" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#0A2463]/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Lock size={10} /> Contraseña de Odoo
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className={INPUT + ' pr-10'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Tu contraseña de Odoo" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A2463]/30 hover:text-[#0A2463]">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[9px] text-amber-600 mt-1">
                  ⚠️ La contraseña se guarda encriptada. Recomendamos usar API Key en su lugar.
                </p>
              </div>
            </div>
          )}

          {/* Test result */}
          {testMsg && (
            <div className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2 ${
              testStatus === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {testStatus === 'ok' ? <CheckCircle2 size={14} /> : <X size={14} />}
              {testMsg}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button onClick={handleTest} disabled={testing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 border-[#0A2463] text-[#0A2463] hover:bg-[#0A2463]/5 transition-all disabled:opacity-50">
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
            <button onClick={handleSave} disabled={saving || testStatus !== 'ok'}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#0A2463', fontFamily: "'Syne', sans-serif" }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
