import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { auditService } from '@/services/auditService';
import type { AuditLogDto } from '@/types/auth.types';

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS:    'bg-green-100 text-green-800',
  LOGIN_FAILED:     'bg-red-100 text-red-800',
  LOGOUT:           'bg-gray-100 text-gray-700',
  ACCOUNT_BLOCKED:  'bg-red-100 text-red-800',
  ACCOUNT_UNLOCKED: 'bg-green-100 text-green-800',
  PASSWORD_CHANGED: 'bg-blue-100 text-blue-800',
  USER_CREATED:     'bg-purple-100 text-purple-800',
  USER_UPDATED:     'bg-yellow-100 text-yellow-800',
  USER_DEACTIVATED: 'bg-red-100 text-red-800',
  USER_REACTIVATED: 'bg-green-100 text-green-800',
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {action}
    </span>
  );
}

function ExpandableRow({ log }: { log: AuditLogDto }) {
  const [open, setOpen] = useState(false);
  const hasData = log.PreviousData || log.NewData;

  return (
    <>
      <tr
        className={`hover:bg-gray-50 transition-colors ${hasData ? 'cursor-pointer' : ''}`}
        onClick={() => hasData && setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {new Date(log.CreatedAt).toLocaleString('es-BO')}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{log.UserName}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{log.Module}</td>
        <td className="px-4 py-3"><ActionBadge action={log.Action} /></td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.Description}</td>
        <td className="px-4 py-3 text-xs text-gray-400">{log.IpAddress ?? '-'}</td>
        <td className="px-4 py-3 text-center">
          {hasData && (
            open
              ? <ChevronDown className="w-4 h-4 text-gray-400 inline" />
              : <ChevronRight className="w-4 h-4 text-gray-400 inline" />
          )}
        </td>
      </tr>
      {open && hasData && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 pb-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {log.PreviousData && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Datos anteriores</p>
                  <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 overflow-x-auto">
                    {JSON.stringify(JSON.parse(log.PreviousData), null, 2)}
                  </pre>
                </div>
              )}
              {log.NewData && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Datos nuevos</p>
                  <pre className="text-xs bg-green-50 border border-green-100 rounded p-2 overflow-x-auto">
                    {JSON.stringify(JSON.parse(log.NewData), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<AuditLogDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');

  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditService.getAll({
        action:     filterAction || undefined,
        from:       filterFrom   || undefined,
        to:         filterTo     || undefined,
        pageNumber: page,
        pageSize:   PAGE_SIZE,
      });
      setLogs(res.Items);
      setTotal(res.TotalCount);
    } catch {
      setError('Error al cargar el registro de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Registro de auditoría</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Log inmutable de todas las acciones del sistema · {total} registros
        </p>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Tipo de acción</label>
          <select
            className="input-field text-sm"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          >
            <option value="">Todas</option>
            {Object.keys(ACTION_COLORS).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Desde</label>
          <input type="date" className="input-field text-sm"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input type="date" className="input-field text-sm"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
        </div>
        <button
          onClick={() => { setFilterAction(''); setFilterFrom(''); setFilterTo(''); setPage(1); }}
          className="btn-secondary text-sm"
        >
          Limpiar filtros
        </button>
      </div>

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
                  {['Fecha / Hora', 'Usuario', 'Módulo', 'Acción', 'Descripción', 'IP', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No hay registros con los filtros aplicados
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <ExpandableRow key={log.Id} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Página {page} de {totalPages} · {total} registros</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">Anterior</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
