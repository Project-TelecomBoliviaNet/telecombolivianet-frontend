import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, UserPlus, Loader2, AlertCircle,
  ChevronUp, Eye, X,
  PauseCircle, PlayCircle, UserX,
} from 'lucide-react';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import { clientService, planService } from '@/services/clientService';
import { useAuthStore } from '@/store/authStore';
import type { ClientListItemDto, ClientFilterDto } from '@/types/client.types';
import type { PlanDto } from '@/types/client.types';
import type { PagedResult } from '@/types/auth.types';

// ── Badges ────────────────────────────────────────────────────────────────────
const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Activo:      'badge-active',
    Suspendido:  'badge-blocked',
    DadoDeBaja:  'badge-inactive',
  };
  const labels: Record<string, string> = {
    Activo: 'Activo', Suspendido: 'Suspendido', DadoDeBaja: 'Dado de baja',
  };
  return <span className={map[s] ?? 'badge-inactive'}>{labels[s] ?? s}</span>;
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const [result,         setResult]         = useState<PagedResult<ClientListItemDto> | null>(null);
  const [plans,          setPlans]          = useState<PlanDto[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [actionError,    setActionError]    = useState('');
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);

  const [filter, setFilter] = useState<ClientFilterDto>({
    Search: '', Status: 'all', DebtFilter: 'all',
    SortBy: 'code', PageNumber: 1, PageSize: 20,
  });
  const [searchText,   setSearchText]   = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPlans = useCallback(async () => {
    try { setPlans(await planService.getAll(true)); } catch { /* ignora */ }
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setResult(await clientService.getAll(filter));
    } catch {
      setError('Error al cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { loadClients(); }, [loadClients]);

  const setPage = (p: number) => setFilter(f => ({ ...f, PageNumber: p }));

  const openConfirm = (state: Omit<ConfirmState, 'open'>) =>
    setConfirmDialog({ ...state, open: true });

  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  const runConfirm = async (fn: () => Promise<void>) => {
    setConfirmRunning(true);
    try { await fn(); }
    finally { setConfirmRunning(false); }
  };

  // Acciones rápidas
  const handleSuspend = (id: string, name: string) => {
    setActionError('');
    openConfirm({
      title:        'Suspender servicio',
      message:      `¿Suspender el servicio de ${name}?\nSe notificará al cliente por WhatsApp.`,
      confirmLabel: 'Suspender',
      variant:      'warning',
      onConfirm:    () => runConfirm(async () => {
        try { await clientService.suspend(id); closeConfirm(); loadClients(); }
        catch { setActionError('Error al suspender. Intenta nuevamente.'); closeConfirm(); }
      }),
    });
  };

  const handleReactivate = (id: string, name: string) => {
    setActionError('');
    openConfirm({
      title:        'Reactivar servicio',
      message:      `¿Reactivar el servicio de ${name}?`,
      confirmLabel: 'Reactivar',
      variant:      'warning',
      onConfirm:    () => runConfirm(async () => {
        try { await clientService.reactivate(id); closeConfirm(); loadClients(); }
        catch { setActionError('Error al reactivar. Intenta nuevamente.'); closeConfirm(); }
      }),
    });
  };

  const handleCancel = (id: string, name: string) => {
    setActionError('');
    openConfirm({
      title:        'Dar de baja',
      message:      `¿Dar de baja a ${name}?\nSus registros se conservarán.`,
      confirmLabel: 'Dar de baja',
      variant:      'danger',
      onConfirm:    () => runConfirm(async () => {
        try {
          const res = await clientService.cancel(id, false);
          if (res.requiresConfirmation) {
            closeConfirm();
            openConfirm({
              title:        'Cliente con deuda pendiente',
              message:      `${name} tiene deuda pendiente. ¿Dar de baja igualmente?`,
              confirmLabel: 'Confirmar baja',
              variant:      'danger',
              onConfirm:    () => runConfirm(async () => {
                try { await clientService.cancel(id, true); closeConfirm(); loadClients(); }
                catch { setActionError('Error al dar de baja. Intenta nuevamente.'); closeConfirm(); }
              }),
            });
          } else {
            closeConfirm(); loadClients();
          }
        } catch { setActionError('Error al dar de baja. Intenta nuevamente.'); closeConfirm(); }
      }),
    });
  };

  const totalPages = result ? Math.ceil(result.TotalCount / (filter.PageSize ?? 20)) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result?.TotalCount ?? 0} clientes registrados
          </p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="btn-primary"
        >
          <UserPlus className="w-4 h-4" />
          Registrar cliente
        </button>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        {/* Búsqueda */}
        <div className="flex-1 min-w-48">
          <label className="label text-xs">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, CI, TBN, Winbox, teléfono, zona…"
              className="input-field pl-9"
              value={searchText}
              onChange={e => {
                const val = e.target.value;
                setSearchText(val);
                if (searchRef.current) clearTimeout(searchRef.current);
                searchRef.current = setTimeout(
                  () => setFilter(f => ({ ...f, Search: val, PageNumber: 1 })),
                  350,
                );
              }}
            />
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="label text-xs">Estado</label>
          <select className="input-field"
            value={filter.Status ?? 'all'}
            onChange={e => setFilter(f => ({ ...f, Status: e.target.value, PageNumber: 1 }))}>
            <option value="all">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Suspendido">Suspendido</option>
            <option value="DadoDeBaja">Dado de baja</option>
          </select>
        </div>

        {/* Plan */}
        <div>
          <label className="label text-xs">Plan</label>
          <select className="input-field"
            value={filter.PlanId ?? ''}
            onChange={e => setFilter(f => ({ ...f, PlanId: e.target.value || undefined, PageNumber: 1 }))}>
            <option value="">Todos</option>
            {plans.map(p => (
              <option key={p.Id} value={p.Id}>{p.Name}</option>
            ))}
          </select>
        </div>

        {/* Deuda */}
        <div>
          <label className="label text-xs">Deuda</label>
          <select className="input-field"
            value={filter.DebtFilter ?? 'all'}
            onChange={e => setFilter(f => ({ ...f, DebtFilter: e.target.value, PageNumber: 1 }))}>
            <option value="all">Todos</option>
            <option value="paid">Al día</option>
            <option value="debt">Con deuda</option>
          </select>
        </div>

        <button
          onClick={() => { setSearchText(''); setFilter({ Search: '', Status: 'all', DebtFilter: 'all', SortBy: 'code', PageNumber: 1, PageSize: 20 }); }}
          className="btn-secondary text-sm"
        >
          Limpiar
        </button>
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
                  {[
                    { key: 'code', label: 'TBN' },
                    { key: 'name', label: 'Cliente' },
                    { key: 'zone', label: 'Zona' },
                    { key: null,   label: 'Teléfono' },
                    { key: null,   label: 'Plan' },
                    { key: null,   label: 'TV' },
                    { key: null,   label: 'Estado' },
                    { key: 'debt', label: 'Deuda' },
                    { key: null,   label: 'Acciones' },
                  ].map(({ key, label }) => (
                    <th key={label}
                      onClick={() => key && setFilter(f => ({ ...f, SortBy: key }))}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                        ${key ? 'cursor-pointer hover:text-gray-900 select-none' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {key && filter.SortBy === key && (
                          <ChevronUp className="w-3 h-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!result?.Items.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No se encontraron clientes con los filtros aplicados
                    </td>
                  </tr>
                ) : result.Items.map(c => (
                  <tr
                    key={c.Id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clients/${c.Id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">
                      {c.TbnCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.FullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.Zone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.PhoneMain}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.PlanName}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      {c.HasTvCable ? '✓' : '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.Status)}</td>
                    <td className="px-4 py-3">
                      {c.TotalDebt > 0 ? (
                        <span className="text-red-700 font-medium text-xs">
                          Bs. {c.TotalDebt.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
                          <span className="text-gray-400 font-normal"> ({c.PendingMonths}m)</span>
                        </span>
                      ) : (
                        <span className="text-green-700 text-xs font-medium">Al día</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Ver perfil */}
                        <button
                          title="Ver perfil"
                          onClick={() => navigate(`/clients/${c.Id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Acciones admin */}
                        {isAdmin() && c.Status === 'Activo' && (
                          <button
                            title="Suspender servicio"
                            onClick={() => handleSuspend(c.Id, c.FullName)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <PauseCircle className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin() && c.Status === 'Suspendido' && (
                          <button
                            title="Reactivar servicio"
                            onClick={() => handleReactivate(c.Id, c.FullName)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin() && c.Status !== 'DadoDeBaja' && (
                          <button
                            title="Dar de baja"
                            onClick={() => handleCancel(c.Id, c.FullName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
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
              <span>Página {filter.PageNumber} de {totalPages} · {result?.TotalCount} clientes</span>
              <div className="flex gap-2">
                <button
                  disabled={(filter.PageNumber ?? 1) <= 1}
                  onClick={() => setPage((filter.PageNumber ?? 1) - 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >Anterior</button>
                <button
                  disabled={(filter.PageNumber ?? 1) >= totalPages}
                  onClick={() => setPage((filter.PageNumber ?? 1) + 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                >Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}
