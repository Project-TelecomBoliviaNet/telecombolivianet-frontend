import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Plus, Loader2, AlertCircle, LayoutList, Columns,
  Clock, AlertTriangle, CheckCircle, XCircle, User,
  ChevronRight, RefreshCw, Star,
} from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { extractApiError } from '@/utils/apiError';
import type {
  TicketListItemDto, TicketDetailDto, TicketFilterRequest, TicketKpiDto,
} from '@/types/ticket.types';
import type { UserSystemDto, PagedResult } from '@/types/auth.types';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import {
  TICKET_TYPES, PRIORITIES, STATUSES,
  KANBAN_ORDER, KANBAN_LABELS, KANBAN_COLORS,
  fmtMs, getSlaInfo, priorityBadge, statusBadge,
} from '@/components/tickets/ticketHelpers';

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCards({ kpi }: { kpi: TicketKpiDto }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {[
        { label: 'Abiertos',     value: kpi.TotalOpen,         icon: AlertCircle,  color: 'text-blue-500' },
        { label: 'En proceso',   value: kpi.TotalInProcess,    icon: Clock,        color: 'text-yellow-500' },
        { label: 'Resueltos',    value: kpi.TotalResolved,     icon: CheckCircle,  color: 'text-green-500' },
        { label: 'Cerrados',     value: kpi.TotalClosed,       icon: XCircle,      color: 'text-gray-400' },
        { label: 'SLA Vencido',  value: kpi.OverdueSla,        icon: AlertTriangle,color: 'text-red-500' },
        { label: 'Hoy',          value: kpi.CreatedToday,      icon: Plus,         color: 'text-indigo-500' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card p-3 flex items-center gap-3">
          <Icon className={`w-5 h-5 shrink-0 ${color}`} />
          <div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
      {kpi.SlaCompliantCount + kpi.SlaBreachedCount > 0 && (
        <div className="card p-3 col-span-2 sm:col-span-3 lg:col-span-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Cumplimiento SLA</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.round(kpi.SlaCompliantCount / (kpi.SlaCompliantCount + kpi.SlaBreachedCount) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(kpi.SlaCompliantCount / (kpi.SlaCompliantCount + kpi.SlaBreachedCount) * 100)}%
              </span>
            </div>
          </div>
          {kpi.AvgCsatScore !== null && (
            <div className="text-center border-l border-gray-100 pl-4">
              <p className="text-xs text-gray-500">CSAT promedio</p>
              <p className="text-lg font-bold text-yellow-500 flex items-center gap-1">
                <Star className="w-4 h-4" /> {kpi.AvgCsatScore?.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fila de ticket ─────────────────────────────────────────────────────────────

function TicketRow({ ticket, onClick }: { ticket: TicketListItemDto; onClick: () => void }) {
  const sla = getSlaInfo(ticket);
  return (
    <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 mb-0.5">
          {/* US-TKT-CORRELATIVO */}
          {ticket.TicketNumber && (
            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
              {ticket.TicketNumber}
            </span>
          )}
          {/* US-TKT-BALANCEO */}
          {ticket.AutoAssigned && (
            <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 shrink-0" title="Auto-asignado por balanceo">
              ⚖️ Auto
            </span>
          )}
        </div>
        <p className="font-medium text-gray-900 text-sm">{ticket.Subject}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{ticket.Description}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800">{ticket.ClientName}</p>
        <p className="text-xs text-gray-400">{ticket.ClientTbn}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{TICKET_TYPES[ticket.Type] ?? ticket.Type}</td>
      <td className="px-4 py-3">{statusBadge(ticket.Status)}</td>
      <td className="px-4 py-3">{priorityBadge(ticket.Priority)}</td>
      <td className="px-4 py-3">
        <span className={`text-xs ${sla.color}`}>{sla.label}</span>
        {sla.badge && (
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded font-semibold
            ${sla.badge === 'CUMPLIDO' ? 'bg-green-100 text-green-700' :
              sla.badge === 'VENCIDO' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            {sla.badge}
          </span>
        )}
        {/* US-TKT-SLA: SlaDeadline */}
        {ticket.SlaDeadline && (
          <p className="text-xs text-gray-400 mt-0.5">
            Límite: {new Date(ticket.SlaDeadline).toLocaleDateString('es-BO')}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {ticket.AssignedToName ?? <span className="italic text-gray-300">Sin asignar</span>}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </td>
    </tr>
  );
}

// ── Kanban ────────────────────────────────────────────────────────────────────

function KanbanView({ kanban, onTicketClick }: { kanban: Record<string, TicketListItemDto[]>; onTicketClick: (t: TicketListItemDto) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_ORDER.map(col => {
        const items = kanban[col] ?? [];
        const { border, head } = KANBAN_COLORS[col] ?? { border: 'border-gray-200 bg-gray-50', head: 'bg-gray-100 text-gray-600' };
        return (
          <div key={col} className={`rounded-xl border-2 ${border} flex flex-col min-h-[200px]`}>
            <div className={`${head} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
              <span className="text-sm font-semibold">{KANBAN_LABELS[col]}</span>
              <span className="text-xs font-bold bg-white/60 rounded-full px-2 py-0.5">{items.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
              {items.length === 0
                ? <p className="text-xs text-center text-gray-400 py-8">Sin tickets</p>
                : items.map(t => {
                    const sla = getSlaInfo(t);
                    return (
                      <div key={t.Id}
                        className="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-gray-200"
                        onClick={() => onTicketClick(t)}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{t.Subject}</p>
                          {priorityBadge(t.Priority)}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{t.ClientName}</p>
                        <p className={`text-xs mt-1.5 ${sla.color}`}>{sla.label}</p>
                        {t.AssignedToName && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />{t.AssignedToName}
                          </p>
                        )}
                      </div>
                    );
                  })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { isAdmin } = useAuthStore();
  const [result,     setResult]     = useState<PagedResult<TicketListItemDto> | null>(null);
  const [kanban,     setKanban]     = useState<Record<string, TicketListItemDto[]>>({});
  const [kpi,        setKpi]        = useState<TicketKpiDto | null>(null);
  const [technicians,setTechnicians]= useState<UserSystemDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [view,       setView]       = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState<TicketDetailDto | null>(null);

  const [filter, setFilter] = useState<TicketFilterRequest>({
    Search: '', Status: 'all', Priority: 'all', PageNumber: 1, PageSize: 20,
  });
  const [searchText, setSearchText] = useState('');
  const listSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTechnicians = useCallback(async () => {
    try {
      const res = await userService.getAll(1, 100);
      setTechnicians(res.Items.filter((u: UserSystemDto) => u.Role === 'Admin' || u.Role === 'Tecnico'));
    } catch { /* no crítico */ }
  }, []);

  const loadKanban = useCallback(async () => {
    try {
      setKanban(await ticketService.getKanban({
        Search: filter.Search, Status: filter.Status,
        Priority: filter.Priority, AssignedToId: filter.AssignedToId,
      }));
    } catch { /* no crítico */ }
  }, [filter.Search, filter.Status, filter.Priority, filter.AssignedToId]);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [listRes, kpiRes] = await Promise.all([ticketService.getAll(filter), ticketService.getKpi()]);
      setResult(listRes); setKpi(kpiRes);
    } catch { setError('Error al cargar los tickets. Verifica tu conexión.'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadTechnicians(); }, [loadTechnicians]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (view === 'kanban') loadKanban(); }, [view, loadKanban]);

  const openDetail = async (t: TicketListItemDto) => {
    try { setSelected(await ticketService.getById(t.Id)); } catch { /* ignora */ }
  };

  const totalPages = result ? Math.ceil(result.TotalCount / (filter.PageSize ?? 20)) : 0;
  const setPage    = (p: number) => setFilter(f => ({ ...f, PageNumber: p }));

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tickets de Soporte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{result?.TotalCount ?? 0} tickets en total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary p-2" title="Recargar"><RefreshCw className="w-4 h-4" /></button>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['list', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'list' ? <><LayoutList className="w-4 h-4" />Lista</> : <><Columns className="w-4 h-4" />Kanban</>}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />Nuevo Ticket
          </button>
        </div>
      </div>

      {kpi && <KpiCards kpi={kpi} />}

      {/* Filtros */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Buscar por asunto, cliente o TBN..."
              value={searchText}
              onChange={e => {
                const val = e.target.value;
                setSearchText(val);
                if (listSearchRef.current) clearTimeout(listSearchRef.current);
                listSearchRef.current = setTimeout(
                  () => setFilter(f => ({ ...f, Search: val, PageNumber: 1 })),
                  350,
                );
              }} />
          </div>
          <select className="input-field w-auto" value={filter.Status ?? 'all'}
            onChange={e => setFilter(f => ({ ...f, Status: e.target.value, PageNumber: 1 }))}>
            <option value="all">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{KANBAN_LABELS[s] ?? s}</option>)}
          </select>
          <select className="input-field w-auto" value={filter.Priority ?? 'all'}
            onChange={e => setFilter(f => ({ ...f, Priority: e.target.value, PageNumber: 1 }))}>
            <option value="all">Todas las prioridades</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button className="ml-auto text-xs text-red-600 underline" onClick={loadData}>Reintentar</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && view === 'list' && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Asunto', 'Cliente', 'Tipo', 'Estado', 'Prioridad', 'SLA', 'Asignado a', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(result?.Items.length ?? 0) === 0
                    ? <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No se encontraron tickets.</td></tr>
                    : result?.Items.map(t => <TicketRow key={t.Id} ticket={t} onClick={() => openDetail(t)} />)}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Página {filter.PageNumber} de {totalPages} · {result?.TotalCount} total</p>
              <div className="flex gap-1">
                <button className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => setPage((filter.PageNumber ?? 1) - 1)}
                  disabled={(filter.PageNumber ?? 1) <= 1}>Anterior</button>
                <button className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => setPage((filter.PageNumber ?? 1) + 1)}
                  disabled={(filter.PageNumber ?? 1) >= totalPages}>Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && view === 'kanban' && <KanbanView kanban={kanban} onTicketClick={openDetail} />}

      {selected && (
        <TicketDetailModal
          ticket={selected} technicians={technicians}
          isAdmin={isAdmin()} onClose={() => setSelected(null)} onRefresh={loadData} />
      )}

      {showCreate && (
        <CreateTicketModal
          technicians={technicians}
          onClose={() => setShowCreate(false)}
          onCreated={loadData} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// M9 — US-TKT-ADJ: Panel de adjuntos del ticket
// ════════════════════════════════════════════════════════════════════════════

import type { TicketAttachmentDto } from '@/types/ticket.types';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';

export function TicketAttachmentsPanel({
  ticketId, isAdmin,
}: { ticketId: string; isAdmin: boolean }) {
  const [items,          setItems]          = useState<TicketAttachmentDto[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  const load = useCallback(async () => {
    try { setItems(await ticketService.getAttachments(ticketId)); }
    catch { setError('Error al cargar adjuntos.'); }
    finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError('El archivo no puede superar 5 MB.'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF.'); return; }
    setUploading(true); setError(null);
    try {
      await ticketService.uploadAttachment(ticketId, file);
      await load();
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error al subir el archivo.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = (att: TicketAttachmentDto) => {
    setConfirmDialog({
      open: true, variant: 'danger',
      title: 'Eliminar adjunto',
      message: `¿Eliminar "${att.FileName}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          await ticketService.deleteAttachment(ticketId, att.Id);
          setItems(prev => prev.filter(a => a.Id !== att.Id));
          closeConfirm();
        } catch {
          setError('Error al eliminar.');
          closeConfirm();
        }
      },
    });
  };

  const fmtSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}
      {/* Upload */}
      <label className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors border ${
        uploading ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
      }`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Subiendo…' : 'Adjuntar archivo (JPG, PNG, PDF, TXT — máx 15 MB)'}
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.txt" className="hidden"
          disabled={uploading} onChange={handleUpload} />
      </label>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Sin adjuntos.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(att => (
            <div key={att.Id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{att.FileName}</p>
                <p className="text-xs text-gray-400">{fmtSize(att.FileSizeBytes)} · {att.SubidoPorNombre}</p>
              </div>
              <button onClick={() => ticketService.downloadAttachment(ticketId, att.Id)}
                className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Descargar">
                <Download className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <button onClick={() => handleDelete(att)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}
