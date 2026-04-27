import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Wrench,
  CheckCircle2, XCircle, Plus,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react';
import {
  getInstalaciones, cancelarInstalacion, completarInstalacion, crearInstalacion,
  STATUS_LABEL, STATUS_COLOR,
  type InstalacionListItemDto, type InstalacionFilterDto,
} from '@/services/installationService';
import { planService, searchClients } from '@/services/clientService';
import type { PlanDto, ClientListItemDto } from '@/types/client.types';

// ══════════════════════════════════════════════════════════════
// InstallationsPage — Gestión de instalaciones agendadas
// ══════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos los estados' },
  { value: 'Pendiente',   label: 'Pendiente' },
  { value: 'EnProceso',   label: 'En proceso' },
  { value: 'Completada',  label: 'Completada' },
  { value: 'Cancelada',   label: 'Cancelada' },
  { value: 'Reprogramada',label: 'Reprogramada' },
];

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status;
  const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ── Modales de acción ─────────────────────────────────────────────────────────

function CancelarModal({
  instalacion, onClose, onDone,
}: {
  instalacion: InstalacionListItemDto;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!motivo.trim()) { setError('El motivo es obligatorio.'); return; }
    setLoading(true);
    try {
      await cancelarInstalacion(instalacion.Id, motivo);
      onDone();
    } catch {
      setError('Error al cancelar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-1">Cancelar instalación</h3>
        <p className="text-sm text-gray-500 mb-4">
          {instalacion.ClienteNombre} — {instalacion.Fecha} {instalacion.HoraInicio}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          rows={3}
          placeholder="Describe el motivo de cancelación..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletarModal({
  instalacion, onClose, onDone,
}: {
  instalacion: InstalacionListItemDto;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completarInstalacion(instalacion.Id, notas || undefined);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-1">Completar instalación</h3>
        <p className="text-sm text-gray-500 mb-4">
          {instalacion.ClienteNombre} — {instalacion.Fecha} {instalacion.HoraInicio}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas del técnico (opcional)
        </label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
          rows={3}
          placeholder="Observaciones, equipos instalados, etc."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Marcar como completada
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: nueva instalación ──────────────────────────────────────────────────

function NuevaInstalacionModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [planes, setPlanes] = useState<PlanDto[]>([]);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClientListItemDto[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientListItemDto | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const [form, setForm] = useState({
    PlanId: '',
    Fecha: '',
    HoraInicio: '',
    DuracionMin: 120,
    Direccion: '',
    Notas: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    planService.getAll(true).then(setPlanes).catch(() => {});
  }, []);

  const buscarClientes = async () => {
    if (!clienteQuery.trim()) return;
    setBuscandoCliente(true);
    try {
      const res = await searchClients({ Query: clienteQuery, PageSize: 5 });
      setClienteResultados(res.Items);
    } catch {
      setClienteResultados([]);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleSubmit = async () => {
    if (!clienteSeleccionado) { setError('Selecciona un cliente.'); return; }
    if (!form.PlanId)          { setError('Selecciona un plan.'); return; }
    if (!form.Fecha)            { setError('Ingresa la fecha.'); return; }
    if (!form.HoraInicio)       { setError('Ingresa la hora de inicio.'); return; }
    if (!form.Direccion.trim()) { setError('Ingresa la dirección.'); return; }

    setLoading(true);
    setError('');
    try {
      await crearInstalacion({
        ClienteId:  clienteSeleccionado.Id,
        PlanId:     form.PlanId,
        Fecha:      form.Fecha,
        HoraInicio: form.HoraInicio,
        DuracionMin: form.DuracionMin,
        Direccion:  form.Direccion,
        Notas:      form.Notas || undefined,
      });
      onDone();
    } catch {
      setError('Error al crear la instalación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-medium text-gray-900 mb-4">Nueva instalación</h3>

        {/* Cliente */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          {clienteSeleccionado ? (
            <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-blue-50">
              <span className="text-sm text-blue-900 font-medium">
                {clienteSeleccionado.TbnCode} — {clienteSeleccionado.FullName}
              </span>
              <button
                onClick={() => { setClienteSeleccionado(null); setClienteResultados([]); setClienteQuery(''); }}
                className="text-xs text-gray-400 hover:text-gray-700 ml-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar por nombre o TBN..."
                  value={clienteQuery}
                  onChange={(e) => setClienteQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarClientes()}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={buscarClientes}
                  disabled={buscandoCliente}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                >
                  {buscandoCliente ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>
              {clienteResultados.length > 0 && (
                <ul className="border rounded-lg mt-1 divide-y text-sm max-h-36 overflow-y-auto">
                  {clienteResultados.map((c) => (
                    <li
                      key={c.Id}
                      onClick={() => { setClienteSeleccionado(c); setClienteResultados([]); }}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    >
                      <span className="font-medium">{c.TbnCode}</span> — {c.FullName}
                      <span className="text-gray-400 text-xs ml-2">({c.PlanName})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Plan */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={form.PlanId}
            onChange={(e) => setForm({ ...form, PlanId: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Seleccionar plan...</option>
            {planes.map((p) => (
              <option key={p.Id} value={p.Id}>
                {p.Name} — {p.SpeedMb} Mb — Bs. {p.MonthlyPrice}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={form.Fecha}
              onChange={(e) => setForm({ ...form, Fecha: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
            <input
              type="time"
              value={form.HoraInicio}
              onChange={(e) => setForm({ ...form, HoraInicio: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Duración y dirección */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
            <input
              type="number"
              min={30}
              max={480}
              value={form.DuracionMin}
              onChange={(e) => setForm({ ...form, DuracionMin: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Av. / Calle..."
              value={form.Direccion}
              onChange={(e) => setForm({ ...form, Direccion: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            placeholder="Observaciones adicionales..."
            value={form.Notas}
            onChange={(e) => setForm({ ...form, Notas: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Crear instalación
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tabla principal ───────────────────────────────────────────────────────────

export default function InstallationsPage() {
  const navigate = useNavigate();

  const [items,   setItems]   = useState<InstalacionListItemDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterFecha,  setFilterFecha]  = useState('');

  const [cancelTarget,   setCancelTarget]   = useState<InstalacionListItemDto | null>(null);
  const [completarTarget, setCompletarTarget] = useState<InstalacionListItemDto | null>(null);
  const [showNueva, setShowNueva] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filter: InstalacionFilterDto = {
        page,
        pageSize: PAGE_SIZE,
        ...(filterStatus && { status: filterStatus }),
        ...(filterFecha  && { fecha: filterFecha }),
      };
      const res = await getInstalaciones(filter);
      setItems(res.Items);
      setTotal(res.Total);
    } catch {
      setError('No se pudo cargar la lista de instalaciones.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterFecha]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDone = () => {
    setCancelTarget(null);
    setCompletarTarget(null);
    setShowNueva(false);
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Instalaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de instalaciones agendadas — {total} en total
          </p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nueva instalación
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterFecha}
          onChange={(e) => { setFilterFecha(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        {(filterStatus || filterFecha) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterFecha(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-800 px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay instalaciones que coincidan con los filtros.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Fecha</span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Hora</span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Técnico</span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((inst) => (
                <tr key={inst.Id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inst.ClienteNombre}</p>
                    <p className="text-xs text-gray-400">{inst.ClienteTbn}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{inst.PlanNombre}</td>
                  <td className="px-4 py-3 text-gray-700">{inst.Fecha}</td>
                  <td className="px-4 py-3 text-gray-700">{inst.HoraInicio}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inst.Status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {inst.TecnicoNombre ?? (
                      <span className="text-amber-600">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {/* Ver detalle */}
                      <button
                        onClick={() => navigate(`/instalaciones/${inst.Id}`)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                        title="Ver detalle"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>

                      {/* Completar */}
                      {(inst.Status === 'Pendiente' || inst.Status === 'EnProceso') && (
                        <button
                          onClick={() => setCompletarTarget(inst)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded"
                          title="Marcar como completada"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancelar */}
                      {inst.Status !== 'Completada' && inst.Status !== 'Cancelada' && (
                        <button
                          onClick={() => setCancelTarget(inst)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          title="Cancelar instalación"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modales */}
      {showNueva && (
        <NuevaInstalacionModal
          onClose={() => setShowNueva(false)}
          onDone={handleDone}
        />
      )}
      {cancelTarget && (
        <CancelarModal
          instalacion={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={handleDone}
        />
      )}
      {completarTarget && (
        <CompletarModal
          instalacion={completarTarget}
          onClose={() => setCompletarTarget(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
