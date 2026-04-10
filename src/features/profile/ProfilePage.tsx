// ARCHIVO: src/features/profile/ProfilePage.tsx
// Perfil del usuario — editar nombre y puesto
// Diseño 1:1 con el sistema: fondo beige, cards luxury-glass, gold/navy
import { useState } from 'react';
import { User, Briefcase, Mail, Shield, Save, Loader2, Sparkles, Calendar } from 'lucide-react';
import { supabase } from '../../services/supabase';
const db = supabase as any;
import type { Profile } from '../../types';

interface Props {
  profile:        Profile;
  email:          string;
  onSaved:        () => void;   // refreshProfile en App
  onToastSuccess: (msg: string) => void;
  onToastError:   (msg: string) => void;
}

const ROLE_LABEL: Record<Profile['role'], string> = {
  admin:    'Administrador',
  gerente:  'Gerente',
  vendedor: 'Ejecutivo de Ventas',
};

const ROLE_CSS: Record<Profile['role'], string> = {
  admin:    'bg-[#D4AF37]/15 text-[#92400e] border-[#D4AF37]/40',
  gerente:  'bg-[#0A2463]/10 text-[#0A2463]  border-[#0A2463]/20',
  vendedor: 'bg-emerald-50   text-emerald-700 border-emerald-200',
};

export default function ProfilePage({ profile, email, onSaved, onToastSuccess, onToastError }: Props) {
  const [fullName,  setFullName]  = useState(profile.full_name  ?? '');
  const [jobTitle,  setJobTitle]  = useState(profile.job_title  ?? '');
  const [saving,    setSaving]    = useState(false);

  const initial = (fullName || email).charAt(0).toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { onToastError('El nombre no puede estar vacío.'); return; }
    setSaving(true);
    try {
      const { error } = await db
        .from('profiles')
        .update({ full_name: fullName.trim(), job_title: jobTitle.trim() || null })
        .eq('id', profile.id);
      if (error) throw error;
      onSaved();
      onToastSuccess('Perfil actualizado correctamente.');
    } catch {
      onToastError('No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* Header de sección */}
      <div className="px-6 py-5 flex items-center bg-white/60 backdrop-blur-md sticky top-0 z-20 border-b border-[#D4AF37]/20 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-[#0A2463] tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          <Sparkles className="text-[#D4AF37]" size={18} />
          Mi Perfil
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Avatar + resumen */}
          <div className="luxury-glass rounded-xl border border-[#D4AF37]/20 shadow-sm p-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0A2463] to-[#1a3a7a] flex items-center justify-center text-[#D4AF37] text-3xl font-black shrink-0 shadow-inner border border-[#D4AF37]/30"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                : initial}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-[#0A2463] truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                {fullName || 'Sin nombre'}
              </p>
              <p className="text-sm text-gray-500 truncate mt-0.5">{jobTitle || 'Sin puesto'}</p>
              <span className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${ROLE_CSS[profile.role]}`}>
                <Shield size={10} />
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
          </div>

          {/* Formulario editable */}
          <form onSubmit={handleSave}>
            <div className="luxury-glass rounded-xl border border-[#D4AF37]/20 shadow-sm overflow-hidden">

              {/* Título de sección */}
              <div className="px-5 py-3.5 border-b border-[#D4AF37]/10 bg-white/40">
                <p className="text-xs font-black text-[#0A2463] uppercase tracking-wider flex items-center gap-2">
                  <User size={13} className="text-[#D4AF37]" /> Información Personal
                </p>
              </div>

              <div className="p-5 space-y-5">

                {/* Nombre completo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={9} /> Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    maxLength={80}
                    placeholder="Ej. Juan Pérez García"
                    className="w-full px-4 py-3 bg-white/60 border border-[#0A2463]/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/40 outline-none text-sm font-medium text-[#0A2463] placeholder-gray-300 transition-all"
                  />
                </div>

                {/* Puesto */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={9} /> Puesto / Cargo
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Ej. Ejecutivo de Ventas"
                    className="w-full px-4 py-3 bg-white/60 border border-[#0A2463]/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/40 outline-none text-sm font-medium text-[#0A2463] placeholder-gray-300 transition-all"
                  />
                </div>

              </div>
            </div>

            {/* Info de solo lectura */}
            <div className="luxury-glass rounded-xl border border-[#D4AF37]/20 shadow-sm overflow-hidden mt-5">
              <div className="px-5 py-3.5 border-b border-[#D4AF37]/10 bg-white/40">
                <p className="text-xs font-black text-[#0A2463] uppercase tracking-wider flex items-center gap-2">
                  <Shield size={13} className="text-[#D4AF37]" /> Datos de Acceso
                </p>
              </div>
              <div className="p-5 space-y-4">

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A2463]/4 border border-[#0A2463]/8">
                  <Mail size={15} className="text-[#D4AF37] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Correo</p>
                    <p className="text-sm font-medium text-[#0A2463] truncate">{email}</p>
                  </div>
                  <span className="ml-auto text-[9px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Solo lectura</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A2463]/4 border border-[#0A2463]/8">
                  <Briefcase size={15} className="text-[#D4AF37] shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Rol en el sistema</p>
                    <p className="text-sm font-medium text-[#0A2463]">{ROLE_LABEL[profile.role]}</p>
                  </div>
                  <span className="ml-auto text-[9px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">IT lo gestiona</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A2463]/4 border border-[#0A2463]/8">
                  <Calendar size={15} className="text-[#D4AF37] shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Miembro desde</p>
                    <p className="text-sm font-medium text-[#0A2463]">
                      {new Date(profile.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Botón guardar */}
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-[#051338] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
                  boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {saving
                  ? <Loader2 size={16} className="animate-spin relative z-10" />
                  : <Save size={16} className="relative z-10" />
                }
                <span className="relative z-10">{saving ? 'Guardando…' : 'Guardar Cambios'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
