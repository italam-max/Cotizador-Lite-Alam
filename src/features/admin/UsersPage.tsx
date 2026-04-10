// ARCHIVO: src/features/admin/UsersPage.tsx
// Panel de administración de usuarios — solo para admins
// Diseño 1:1 con el sistema: fondo beige, luxury-glass, navy/gold
import { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Search, Sparkles, Loader2,
  ChevronDown, Check, UserCog, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
const db = supabase as any;
import type { Profile } from '../../types';

interface Props {
  currentUserId:  string;
  onToastSuccess: (msg: string) => void;
  onToastError:   (msg: string) => void;
}

const ROLES: Profile['role'][] = ['vendedor', 'gerente', 'admin'];

const ROLE_LABEL: Record<Profile['role'], string> = {
  vendedor: 'Ejecutivo',
  gerente:  'Gerente',
  admin:    'Admin',
};

const ROLE_CSS: Record<Profile['role'], string> = {
  admin:    'bg-[#D4AF37]/15 text-[#92400e] border-[#D4AF37]/40',
  gerente:  'bg-[#0A2463]/10 text-[#0A2463]  border-[#0A2463]/20',
  vendedor: 'bg-emerald-50   text-emerald-700 border-emerald-200',
};

export default function UsersPage({ currentUserId, onToastSuccess, onToastError }: Props) {
  const [users,   setUsers]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [saving,  setSaving]  = useState<string | null>(null);   // id del usuario que se está guardando
  const [open,    setOpen]    = useState<string | null>(null);   // dropdown abierto

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setUsers(data ?? []);
    } catch {
      onToastError('No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, [onToastError]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  const changeRole = async (userId: string, newRole: Profile['role']) => {
    setOpen(null);
    setSaving(userId);
    try {
      const { error } = await db
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      onToastSuccess(`Rol actualizado a ${ROLE_LABEL[newRole]} correctamente.`);
    } catch {
      onToastError('No se pudo cambiar el rol. Intenta de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  const filtered = users.filter(u => {
    const term = search.toLowerCase();
    return (
      !term ||
      (u.full_name ?? '').toLowerCase().includes(term) ||
      (u.email     ?? '').toLowerCase().includes(term) ||
      (u.job_title ?? '').toLowerCase().includes(term)
    );
  });

  const initial = (u: Profile) =>
    ((u.full_name ?? u.email ?? '?').charAt(0)).toUpperCase();

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* Header de sección */}
      <div className="px-6 py-5 flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-20 border-b border-[#D4AF37]/20 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-[#0A2463] tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          <Sparkles className="text-[#D4AF37]" size={18} />
          Gestión de Usuarios
        </h1>
        <span className="text-xs font-bold text-[#0A2463]/50 bg-[#0A2463]/5 px-3 py-1 rounded-full border border-[#0A2463]/10">
          {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Aviso informativo */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5">
            <AlertCircle size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
            <p className="text-xs text-[#0A2463]/70 leading-relaxed">
              Los accesos (alta de usuarios y contraseñas) son gestionados por IT directamente en Supabase.
              Aquí puedes ajustar roles y visualizar el equipo activo.
            </p>
          </div>

          {/* Tabla de usuarios */}
          <div className="luxury-glass rounded-xl border border-[#D4AF37]/20 shadow-sm overflow-hidden">

            {/* Barra de búsqueda */}
            <div className="px-4 py-3 border-b border-[#D4AF37]/10 bg-white/40 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A2463]/40 group-focus-within:text-[#D4AF37] transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/60 border border-[#0A2463]/10 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#D4AF37]/50 outline-none text-[#0A2463] transition-all"
                />
              </div>
            </div>

            {/* Encabezado tabla */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-2.5 bg-[#0A2463]/4 border-b border-[#D4AF37]/8">
              <div className="w-10" />
              <p className="text-[9px] font-black text-[#0A2463]/50 uppercase tracking-wider">Usuario</p>
              <p className="text-[9px] font-black text-[#0A2463]/50 uppercase tracking-wider w-28 text-center">Rol</p>
              <p className="text-[9px] font-black text-[#0A2463]/50 uppercase tracking-wider w-24 text-right">Miembro desde</p>
            </div>

            {/* Filas */}
            <div className="divide-y divide-[#D4AF37]/8 bg-white/30">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-[#D4AF37]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-[#0A2463]/40">
                  <Users size={40} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">
                    {search ? 'Sin resultados para la búsqueda' : 'Sin usuarios registrados'}
                  </p>
                </div>
              ) : filtered.map(u => (
                <div
                  key={u.id}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center px-5 py-4 hover:bg-white/60 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2463] to-[#1a3a7a] flex items-center justify-center text-[#D4AF37] font-black text-sm shrink-0 border border-[#D4AF37]/20 shadow-inner"
                    style={{ fontFamily: "'Syne', sans-serif" }}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                      : initial(u)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#0A2463] text-sm truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                        {u.full_name ?? <span className="text-gray-400 italic font-normal">Sin nombre</span>}
                      </p>
                      {u.id === currentUserId && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-[#D4AF37]/15 text-[#92400e] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    {u.job_title && (
                      <p className="text-[10px] text-[#0A2463]/50 font-medium truncate">{u.job_title}</p>
                    )}
                  </div>

                  {/* Dropdown de rol */}
                  <div className="relative w-28 self-center">
                    {saving === u.id ? (
                      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0A2463]/5 border border-[#0A2463]/10">
                        <Loader2 size={12} className="animate-spin text-[#D4AF37]" />
                        <span className="text-xs text-[#0A2463]/60">…</span>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setOpen(open === u.id ? null : u.id); }}
                        disabled={u.id === currentUserId}
                        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all
                          ${u.id === currentUserId
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:shadow-sm hover:bg-white cursor-pointer'
                          } ${ROLE_CSS[u.role]}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Shield size={10} />
                          {ROLE_LABEL[u.role]}
                        </span>
                        {u.id !== currentUserId && <ChevronDown size={12} className={`transition-transform ${open === u.id ? 'rotate-180' : ''}`} />}
                      </button>
                    )}

                    {/* Opciones de rol */}
                    {open === u.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute top-full mt-1.5 right-0 w-36 rounded-xl overflow-hidden shadow-xl border border-[#D4AF37]/20 z-30"
                        style={{ background: 'linear-gradient(135deg, #051338ee, #0A2463ee)', backdropFilter: 'blur(20px)' }}
                      >
                        <div className="px-3 py-2 border-b border-white/10">
                          <p className="text-[8px] font-black text-[#D4AF37]/70 uppercase tracking-widest flex items-center gap-1">
                            <UserCog size={8} /> Cambiar rol
                          </p>
                        </div>
                        {ROLES.map(r => (
                          <button
                            key={r}
                            onClick={() => changeRole(u.id, r)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <span className="flex items-center gap-2">
                              <Shield size={11} className="text-[#D4AF37]/60" />
                              {ROLE_LABEL[r]}
                            </span>
                            {u.role === r && <Check size={11} className="text-[#D4AF37]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fecha */}
                  <div className="w-24 text-right hidden sm:block">
                    <p className="text-[10px] text-gray-400 font-medium">
                      {new Date(u.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
