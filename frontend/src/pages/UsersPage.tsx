import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus, Search, Loader2, AlertCircle,
  LockOpen, UserX, UserCheck, Pencil, X, Check,
  Eye, EyeOff, ShieldCheck, KeyRound,
} from 'lucide-react';
import {
  userService,
  ROLE_LABELS, ROLE_COLORS,
  type UserRoleKey, type RolePermissionsDto,
} from '@/services/userService';
import type { UserSystemDto, CreateUserRequest, UpdateUserRequest } from '@/types/auth.types';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import { extractApiError } from '@/utils/apiError';

// ── Helpers de badge ──────────────────────────────────────────────────────────

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Activo:    'badge-active',
    Bloqueado: 'badge-blocked',
    Inactivo:  'badge-inactive',
  };
  return <span className={map[s] ?? 'badge-inactive'}>{s}</span>;
};

const roleBadge = (r: string) => {
  const colorClass = ROLE_COLORS[r as UserRoleKey] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = ROLE_LABELS[r as UserRoleKey] ?? r;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
      {label}
    </span>
  );
};

// ── Esquemas Zod ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  FullName:          z.string().min(2, 'Obligatorio').max(150),
  Email:             z.string().email('Email inválido'),
  TemporaryPassword: z
    .string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener una mayúscula')
    .regex(/[a-z]/, 'Debe tener una minúscula')
    .regex(/[0-9]/, 'Debe tener un número'),
  Role: z.enum(['Admin', 'Tecnico', 'SocioLectura']),
});

const editSchema = z.object({
  FullName: z.string().min(2, 'Obligatorio').max(150),
  Email:    z.string().email('Email inválido'),
  Role:     z.enum(['Admin', 'Tecnico', 'SocioLectura']),
  Phone:    z.string().max(20).nullable().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

// ── Modal reutilizable ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,       setUsers]       = useState<UserSystemDto[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<UserSystemDto | null>(null);
  const [actionError,    setActionError]    = useState('');
  const [saving,         setSaving]         = useState(false);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  const PAGE_SIZE = 20;

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getAll(page, PAGE_SIZE);
      setUsers(res.Items);
      setTotal(res.TotalCount);
    } catch {
      setError('Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filtro local por nombre / email ─────────────────────────────────────────

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.FullName.toLowerCase().includes(q) ||
      u.Email.toLowerCase().includes(q)
    );
  });

  // ── Formulario Crear ────────────────────────────────────────────────────────

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const handleCreate = async (data: CreateForm) => {
    setActionError('');
    setSaving(true);
    try {
      await userService.create(data as CreateUserRequest);
      setShowCreate(false);
      createForm.reset();
      loadUsers();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al crear el usuario.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Formulario Editar ───────────────────────────────────────────────────────

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const openEdit = (u: UserSystemDto) => {
    setEditTarget(u);
    editForm.reset({ FullName: u.FullName, Email: u.Email, Role: u.Role, Phone: u.Phone });
    setActionError('');
  };

  const handleEdit = async (data: EditForm) => {
    if (!editTarget) return;
    setActionError('');
    setSaving(true);
    try {
      await userService.update(editTarget.Id, data as UpdateUserRequest);
      setEditTarget(null);
      loadUsers();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al actualizar el usuario.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Acciones rápidas ────────────────────────────────────────────────────────

  const quickAction = (fn: () => Promise<void>, title: string, message: string) => {
    setActionError('');
    setConfirmDialog({
      open: true, title, message, confirmLabel: 'Confirmar', variant: 'warning',
      onConfirm: async () => {
        setConfirmRunning(true);
        try { await fn(); closeConfirm(); loadUsers(); }
        catch { setActionError('Ocurrió un error. Intenta nuevamente.'); closeConfirm(); }
      },
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios del sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} usuarios registrados</p>
        </div>
        <button onClick={() => { setShowCreate(true); setActionError(''); }}
          className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="input-field pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nombre', 'Correo', 'Rol', 'Estado', 'Último acceso', 'Acciones']
                    .map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : filtered.map((u) => (
                  <tr key={u.Id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.FullName}</div>
                      {u.RequiresPasswordChange && (
                        <span className="text-xs text-amber-600">Requiere cambiar contraseña</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.Email}</td>
                    <td className="px-4 py-3">{roleBadge(u.Role)}</td>
                    <td className="px-4 py-3">{statusBadge(u.Status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.LastLoginAt
                        ? new Date(u.LastLoginAt).toLocaleString('es-BO')
                        : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Editar */}
                        <button
                          title="Editar"
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Desbloquear */}
                        {u.Status === 'Bloqueado' && (
                          <button
                            title="Desbloquear"
                            onClick={() => quickAction(
                              () => userService.unlock(u.Id),
                              'Desbloquear cuenta',
                              `¿Desbloquear la cuenta de ${u.FullName}?`
                            )}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <LockOpen className="w-4 h-4" />
                          </button>
                        )}

                        {/* Desactivar / Reactivar */}
                        {u.Status === 'Activo' ? (
                          <button
                            title="Desactivar"
                            onClick={() => quickAction(
                              () => userService.deactivate(u.Id),
                              'Desactivar cuenta',
                              `¿Desactivar la cuenta de ${u.FullName}?\nEl usuario no podrá iniciar sesión.`
                            )}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : u.Status === 'Inactivo' ? (
                          <button
                            title="Reactivar"
                            onClick={() => quickAction(
                              () => userService.reactivate(u.Id),
                              'Reactivar cuenta',
                              `¿Reactivar la cuenta de ${u.FullName}?`
                            )}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Crear usuario ─────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Nuevo usuario" onClose={() => setShowCreate(false)}>
          {actionError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{actionError}
            </div>
          )}
          <form onSubmit={createForm.handleSubmit(handleCreate)} noValidate className="space-y-4">
            {[
              { id: 'FullName',          label: 'Nombre completo',    type: 'text',     placeholder: 'Juan Pérez López'             },
              { id: 'Email',             label: 'Correo electrónico', type: 'email',    placeholder: 'juan@telecombolivianet.bo'    },
              { id: 'TemporaryPassword', label: 'Contraseña temporal', type: 'password', placeholder: 'Mínimo 8 caracteres'          },
            ].map(({ id, label, type, placeholder }) => (
              <div key={id}>
                <label className="label">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  className={`input-field ${createForm.formState.errors[id as keyof CreateForm] ? 'input-error' : ''}`}
                  {...createForm.register(id as keyof CreateForm)}
                />
                {createForm.formState.errors[id as keyof CreateForm] && (
                  <p className="error-msg">
                    {createForm.formState.errors[id as keyof CreateForm]?.message}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="label">Rol</label>
              <select
                className={`input-field ${createForm.formState.errors.Role ? 'input-error' : ''}`}
                {...createForm.register('Role')}
              >
                <option value="">Selecciona un rol</option>
                <option value="Admin">Administrador</option>
                <option value="Tecnico">Técnico</option>
                <option value="SocioLectura">Socio (solo lectura)</option>
              </select>
              {createForm.formState.errors.Role && (
                <p className="error-msg">{createForm.formState.errors.Role.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Crear usuario'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Editar usuario ────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title="Editar usuario" onClose={() => setEditTarget(null)}>
          {actionError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{actionError}
            </div>
          )}
          <form onSubmit={editForm.handleSubmit(handleEdit)} noValidate className="space-y-4">
            {[
              { id: 'FullName', label: 'Nombre completo',    type: 'text'  },
              { id: 'Email',    label: 'Correo electrónico', type: 'email' },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <label className="label">{label}</label>
                <input
                  type={type}
                  className={`input-field ${editForm.formState.errors[id as keyof EditForm] ? 'input-error' : ''}`}
                  {...editForm.register(id as keyof EditForm)}
                />
                {editForm.formState.errors[id as keyof EditForm] && (
                  <p className="error-msg">
                    {editForm.formState.errors[id as keyof EditForm]?.message}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="label">WhatsApp (notificaciones de tickets)</label>
              <input
                type="tel"
                placeholder="59170000000 — con código de país"
                className="input-field"
                {...editForm.register('Phone')}
              />
              <p className="text-xs text-gray-400 mt-1">
                Requerido para técnicos. El sistema envía avisos de asignación a este número.
              </p>
            </div>

            <div>
              <label className="label">Rol</label>
              <select
                className={`input-field ${editForm.formState.errors.Role ? 'input-error' : ''}`}
                {...editForm.register('Role')}
              >
                <option value="Admin">Administrador</option>
                <option value="Tecnico">Técnico</option>
                <option value="SocioLectura">Socio (solo lectura)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// M7 — Modales adicionales (se renderizan desde UsersPage via portal pattern)
// ════════════════════════════════════════════════════════════════════════════

// US-ROL-PERMISOS · Modal de matriz de permisos
export function PermissionMatrixModal({
  matrix, onClose,
}: { matrix: RolePermissionsDto[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Matriz de permisos por rol
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          {matrix.map(role => (
            <div key={role.Role} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2.5 py-1 text-sm font-semibold rounded-full border ${ROLE_COLORS[role.Role as UserRoleKey] ?? 'bg-gray-100'}`}>
                  {role.Label}
                </span>
                <span className="text-sm text-gray-500">{role.Descripcion}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Módulos</p>
                  <ul className="space-y-1">
                    {role.Modulos.map(m => (
                      <li key={m} className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Check className="w-3 h-3 text-green-500 shrink-0" /> {m}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Políticas de API</p>
                  <ul className="space-y-1">
                    {role.Politicas.map(p => (
                      <li key={p} className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// US-USR-RECOVERY · Modal de recuperación de contraseña
export function PasswordRecoveryModal({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState('');
  const [token,   setToken]   = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass,setConfPass]= useState('');
  const [step,    setStep]    = useState<'email' | 'reset' | 'done'>('email');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState('');
  // US-USR-PASS-SHOW
  const [showPass, setShowPass] = useState(false);

  const handleSendEmail = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      const r = await userService.forgotPassword(email);
      setResult(r.Message + (r.SentTo ? ` (enviado a ${r.SentTo} vía ${r.Channel})` : ''));
      setStep('reset');
    } catch { setError('Error al enviar la solicitud.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!token || !newPass || !confPass) return;
    setLoading(true); setError('');
    try {
      await userService.resetPassword(token, newPass, confPass);
      setStep('done');
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cambiar la contraseña.'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" /> Recuperar acceso
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {step === 'email' && (
            <>
              <p className="text-sm text-gray-600">
                Ingresa el email del usuario. Le enviaremos un código de recuperación.
              </p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="input-field"
              />
              <button
                onClick={handleSendEmail}
                disabled={!email || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Enviar código
              </button>
            </>
          )}

          {step === 'reset' && (
            <>
              {result && <p className="text-sm text-green-700 bg-green-50 p-2 rounded">{result}</p>}
              <p className="text-sm text-gray-600">
                Ingresa el código recibido y tu nueva contraseña.
              </p>
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Código de recuperación"
                className="input-field font-mono"
              />
              {/* US-USR-PASS-SHOW: toggle visibilidad */}
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Nueva contraseña (mín. 8 caracteres)"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={confPass}
                onChange={e => setConfPass(e.target.value)}
                placeholder="Confirmar contraseña"
                className="input-field"
              />
              <button
                onClick={handleResetPassword}
                disabled={!token || !newPass || !confPass || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Cambiar contraseña
              </button>
              <button onClick={() => setStep('email')} className="btn-secondary w-full text-sm">
                ← Volver
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">¡Contraseña actualizada!</p>
              <p className="text-sm text-gray-500 mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button onClick={onClose} className="btn-primary mt-4">Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// US-USR-PASS-SHOW · Password field con toggle (reutilizable)
export function PasswordField({
  value, onChange, placeholder = 'Contraseña', autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input-field pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
