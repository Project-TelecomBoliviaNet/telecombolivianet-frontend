import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  Loader2, AlertCircle, Search, Play, Plus,
  FileSpreadsheet, FileText, XCircle, Eye, CreditCard,
  TrendingUp, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Send,
} from 'lucide-react';
import { extractApiError } from '@/utils/apiError';
import { VoidModal } from '@/components/invoices/VoidModal';
import { RunJobModal } from '@/components/invoices/RunJobModal';
import { InvoicePaymentDetailModal } from '@/components/invoices/InvoicePaymentDetailModal';
import { ExtraordinaryInvoiceModal } from '@/components/invoices/ExtraordinaryInvoiceModal';
import {
  invoiceService,
  createExtraordinaryInvoice, transicionarEstado,
  marcarFacturasEnviadas,
  INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, INVOICE_TRANSITIONS,
  MOTIVOS_EXTRAORDINARIOS, MOTIVO_LABELS,
  type InvoiceStatus, type MotivoExtraordinario,
} from '@/services/invoiceService';
import { PaymentModal } from '@/components/clients/PaymentModal';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import type { InvoiceMonthStatsDto, InvoiceDetailDto, BillingJobResultDto } from '@/types/invoice.types';
import type { PagedResult } from '@/types/auth.types';
import type { InvoiceDto } from '@/types/client.types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const statusBadge = (s: string) => {
  const color = INVOICE_STATUS_COLORS[s as InvoiceStatus] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = INVOICE_STATUS_LABELS[s as InvoiceStatus] ?? s;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
};

// ── Tarjeta de estadística ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string;
  icon: ReactNode; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function InvoicesPage() {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats,  setStats]  = useState<InvoiceMonthStatsDto | null>(null);
  const [result, setResult] = useState<PagedResult<InvoiceDetailDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [statusFilter,  setStatusFilter]  = useState('');
  // M3 states
  const [showExtraModal,  setShowExtraModal]  = useState(false);
  const [transicionTarget, setTransicionTarget] = useState<{id: string; current: InvoiceStatus} | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [markingEnviadas, setMarkingEnviadas] = useState(false);
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [useDateFilter, setUseDateFilter] = useState(true); // fecha es filtro opcional

  // Modales
  const [voidTarget,    setVoidTarget]    = useState<InvoiceDetailDto | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<InvoiceDetailDto | null>(null);
  const [detailTarget,  setDetailTarget]  = useState<InvoiceDetailDto | null>(null);
  const [showRunJob,    setShowRunJob]    = useState(false);
  const [jobResult,     setJobResult]     = useState<BillingJobResultDto | null>(null);

  const [voidSaving,     setVoidSaving]     = useState(false);
  const [jobRunning,     setJobRunning]     = useState(false);
  const [actionError,    setActionError]    = useState('');
  const [actionMessage,  setActionMessage]  = useState('');
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [statsData, invoicesData] = await Promise.all([
        invoiceService.getStats(year, month),
        invoiceService.getAll({
          year:   useDateFilter ? year  : undefined,
          month:  useDateFilter ? month : undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          pageNumber: page, pageSize: 25,
        }),
      ]);
      setStats(statsData);
      setResult(invoicesData);
    } catch {
      setError('Error al cargar las facturas.');
    } finally {
      setLoading(false);
    }
  }, [year, month, statusFilter, search, page, useDateFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Anular factura (US-25) ────────────────────────────────────────────────
  const handleVoid = async (justification: string) => {
    if (!voidTarget) return;
    setVoidSaving(true);
    try {
      await invoiceService.voidInvoice(voidTarget.Id, justification);
      setVoidTarget(null);
      load();
    } catch (e: unknown) {
      setActionError(extractApiError(e, 'Error al anular la factura.'));
    } finally {
      setVoidSaving(false);
    }
  };

  // ── Ejecutar job manual (US-26) ───────────────────────────────────────────
  const handleRunJob = async (y: number, m: number) => {
    setJobRunning(true);
    try {
      const res = await invoiceService.generateManual(y, m);
      setJobResult(res);
      setShowRunJob(false);
      setYear(y); setMonth(m);
      load();
    } catch (e: unknown) {
      setActionError(extractApiError(e, 'Error al ejecutar la facturación.'));
    } finally {
      setJobRunning(false);
    }
  };

  // ── Exportar Excel desde backend (US-24) ─────────────────────────────────
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF,   setExportingPDF]   = useState(false);

  const handleExportExcel = async () => {
    if (!useDateFilter) {
      setActionError('Activa el filtro de mes para exportar Excel.');
      return;
    }
    setExportingExcel(true); setActionError('');
    try { await invoiceService.exportExcel(year, month); }
    catch { setActionError('Error al generar el Excel.'); }
    finally { setExportingExcel(false); }
  };

  // ── Exportar PDF desde backend (US-24) ───────────────────────────────────
  const handleExportPDF = async () => {
    if (!useDateFilter) {
      setActionError('Activa el filtro de mes para exportar PDF.');
      return;
    }
    setExportingPDF(true); setActionError('');
    try { await invoiceService.exportPdf(year, month); }
    catch { setActionError('Error al generar el PDF.'); }
    finally { setExportingPDF(false); }
  };

  // Alias para recargar (usado en los handlers M3)
  const reload = load;

  // ── US-FAC-ESTADOS: Transicionar estado ──────────────────────────────────
  const handleTransicion = async (nuevoEstado: InvoiceStatus) => {
    if (!transicionTarget) return;
    setTransitioning(true);
    try {
      await transicionarEstado(transicionTarget.id, nuevoEstado);
      setTransicionTarget(null);
      reload();
    } catch (e: unknown) {
      setActionError(extractApiError(e, 'Error al cambiar estado.'));
    } finally {
      setTransitioning(false);
    }
  };

  const totalPages = result ? Math.ceil(result.TotalCount / 25) : 0;

  // ── Construir facturas para PaymentModal a partir de InvoiceDetailDto ─────
  const buildInvoiceDtos = (inv: InvoiceDetailDto): InvoiceDto[] => [{
    Id: inv.Id, Type: inv.Type as any, Status: inv.Status,
    Year: inv.Year, Month: inv.Month, Amount: inv.Amount,
    IssuedAt: inv.IssuedAt, DueDate: inv.DueDate, Notes: inv.Notes,
  }];

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {MONTHS[month]} {year} — {result?.TotalCount ?? 0} facturas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowRunJob(true)} className="btn-secondary text-sm">
            <Play className="w-4 h-4" /> Re-ejecutar job del mes
          </button>
          <button onClick={handleExportExcel} disabled={exportingExcel}
            className="btn-secondary text-sm disabled:opacity-60">
            {exportingExcel
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileSpreadsheet className="w-4 h-4" /> Excel</>}
          </button>
          <button onClick={handleExportPDF} disabled={exportingPDF}
            className="btn-secondary text-sm disabled:opacity-60">
            {exportingPDF
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileText className="w-4 h-4" /> PDF</>}
          </button>
        </div>
      </div>

      {/* ── Selector de período ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <select className="input-field w-36" value={month}
          onChange={e => { setMonth(parseInt(e.target.value)); setPage(1); }}>
          {MONTHS.slice(1).map((m, i) => (
            <option key={i+1} value={i+1}>{m}</option>
          ))}
        </select>
        <input type="number" className="input-field w-24" value={year} min={2024} max={2100}
          onChange={e => { setYear(parseInt(e.target.value)); setPage(1); }} />
      </div>

      {/* ── Resultado del último job ──────────────────────────────────────── */}
      {jobResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 text-sm text-green-800">
          <strong>Facturación {jobResult.Period} completada:</strong>{' '}
          {jobResult.Generated} generadas · {jobResult.Skipped} ya existían ·{' '}
          {jobResult.ExcludedBaja} clientes de baja omitidos
          {jobResult.Errors > 0 && ` · ${jobResult.Errors} errores`}
          <button onClick={() => setJobResult(null)} className="ml-3 text-green-600 hover:text-green-800 font-medium">
            Cerrar
          </button>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg mb-5">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* ── Tarjetas de estadísticas ──────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total facturado" icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            color="bg-blue-100"
            value={`Bs. ${stats.TotalBilled.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`}
            sub={`${stats.CountBilled} facturas`}
          />
          <StatCard
            label="Total cobrado" icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            color="bg-green-100"
            value={`Bs. ${stats.TotalCollected.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`}
            sub={`${stats.CollectionRate}% de cobranza`}
          />
          <StatCard
            label="Pendiente + Vencido" icon={<Clock className="w-5 h-5 text-amber-600" />}
            color="bg-amber-100"
            value={`Bs. ${stats.TotalPending.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`}
            sub={`${stats.CountPending} pendientes · ${stats.CountOverdue} vencidas`}
          />
          <StatCard
            label="Tasa de cobranza" icon={<AlertTriangle className="w-5 h-5 text-purple-600" />}
            color="bg-purple-100"
            value={`${stats.CollectionRate}%`}
            sub={stats.CollectionRate >= 80 ? 'Buen rendimiento' : 'Requiere atención'}
          />
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="label text-xs">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-9"
              placeholder="Nombre o código TBN…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div>
          <label className="label text-xs">Estado</label>
          <select className="input-field" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="Emitida">Emitida</option>
            <option value="Enviada">Enviada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Vencida">Vencida</option>
            <option value="ParcialmentePagada">Pago Parcial</option>
            <option value="Pagada">Pagada</option>
            <option value="Anulada">Anulada</option>
          </select>
        </div>
        {/* Filtro de mes opcional — estándar ISP */}
        <div className="flex items-center gap-2 pt-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={useDateFilter}
              onChange={e => { setUseDateFilter(e.target.checked); setPage(1); }}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
          <span className="text-xs text-gray-600">
            {useDateFilter ? `Filtrando: ${MONTHS[month]} ${year}` : 'Todos los meses'}
          </span>
        </div>
        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
          className="btn-secondary text-sm">
          Limpiar
        </button>
        {/* US-FAC-ESTADOS: Marcar todas las Emitidas como Enviadas */}
        <button
          onClick={() => {
            setActionError(''); setActionMessage('');
            setConfirmDialog({
              open: true, variant: 'warning',
              title: 'Marcar como Enviadas',
              message: `¿Marcar todas las facturas Emitidas de ${MONTHS[month]} ${year} como Enviadas y enviar notificaciones WhatsApp?`,
              confirmLabel: 'Confirmar',
              onConfirm: async () => {
                setConfirmRunning(true);
                try {
                  const r = await marcarFacturasEnviadas(year, month);
                  setActionMessage(`${r.Count} facturas marcadas como Enviadas. Notificaciones enviadas.`);
                  closeConfirm(); reload();
                } catch { setActionError('Error al marcar facturas.'); closeConfirm(); }
                finally { setMarkingEnviadas(false); }
              },
            });
            setMarkingEnviadas(true);
          }}
          disabled={markingEnviadas}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          {markingEnviadas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Marcar Enviadas
        </button>
        {/* US-FAC-02: Crear factura extraordinaria */}
        <button
          onClick={() => setShowExtraModal(true)}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Factura Extra
        </button>
      </div>

      {/* ── Tabla de facturas ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando facturas...
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['N° Factura', 'TBN', 'Cliente', 'Monto', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!result?.Items.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No hay facturas para {MONTHS[month]} {year} con los filtros aplicados
                    </td>
                  </tr>
                ) : result.Items.map(inv => (
                  <tr key={inv.Id} className="hover:bg-gray-50 transition-colors">
                    {/* US-FAC-CORRELATIVO */}
                    <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-700">
                      {(inv as any).InvoiceNumber ?? '—'}
                      {(inv as any).IsExtraordinary && (
                        <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1 rounded">EXT</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">
                      {inv.TbnCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.ClientName}</td>
                    <td className="px-4 py-3 font-medium">
                      <div>Bs. {inv.Amount.toLocaleString('es-BO', { minimumFractionDigits: 0 })}</div>
                      {/* US-FAC-CREDITO: mostrar crédito aplicado */}
                      {(inv as any).CreditApplied > 0 && (
                        <div className="text-xs text-green-600">-Bs. {(inv as any).CreditApplied.toFixed(2)} crédito</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(inv.DueDate).toLocaleDateString('es-BO')}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(inv.Status)}
                      {/* US-FAC-ESTADOS: botón de transición */}
                      {INVOICE_TRANSITIONS[inv.Status as InvoiceStatus]?.length > 0 && (
                        <button
                          onClick={() => setTransicionTarget({ id: inv.Id, current: inv.Status as InvoiceStatus })}
                          className="ml-1 p-0.5 text-gray-400 hover:text-indigo-600 rounded"
                          title="Cambiar estado"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Registrar pago */}
                        {(inv.Status === 'Pendiente' || inv.Status === 'Vencida') && (
                          <button
                            title="Registrar pago"
                            onClick={() => setPaymentTarget(inv)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        {/* Ver detalle del pago */}
                        {inv.Status === 'Pagada' && (
                          <button
                            title="Ver detalle del pago"
                            onClick={() => setDetailTarget(inv)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {/* Anular factura */}
                        {(inv.Status === 'Pendiente' || inv.Status === 'Vencida') && (
                          <button
                            title="Anular factura"
                            onClick={() => setVoidTarget(inv)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Página {page} de {totalPages} · {result?.TotalCount} facturas</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">Anterior</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modales ───────────────────────────────────────────────────────── */}

      {voidTarget && (
        <VoidModal
          invoice={voidTarget}
          onConfirm={handleVoid}
          onClose={() => setVoidTarget(null)}
          saving={voidSaving}
        />
      )}

      {showRunJob && (
        <RunJobModal
          onConfirm={handleRunJob}
          onClose={() => setShowRunJob(false)}
          running={jobRunning}
        />
      )}

      {detailTarget && (
        <InvoicePaymentDetailModal
          invoice={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {paymentTarget && (
        <PaymentModal
          clientId={paymentTarget.ClientId}
          invoices={buildInvoiceDtos(paymentTarget)}
          preselected={paymentTarget.Id}
          onSuccess={() => { setPaymentTarget(null); load(); }}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* ── US-FAC-ESTADOS: Modal transición de estado ─────────────────── */}
      {transicionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-indigo-600" /> Cambiar estado
              </h3>
              <button onClick={() => setTransicionTarget(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">
                Estado actual: {statusBadge(transicionTarget.current)}
              </p>
              <p className="text-xs text-gray-500">Selecciona el nuevo estado:</p>
              <div className="flex flex-col gap-2">
                {INVOICE_TRANSITIONS[transicionTarget.current].map(s => (
                  <button
                    key={s}
                    disabled={transitioning}
                    onClick={() => handleTransicion(s)}
                    className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-gray-800">{INVOICE_STATUS_LABELS[s]}</span>
                    {statusBadge(s)}
                    {transitioning && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                  </button>
                ))}
              </div>
              <button onClick={() => setTransicionTarget(null)} className="btn-secondary w-full text-sm mt-2">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── US-FAC-02: Modal factura extraordinaria ─────────────────────── */}
      {showExtraModal && (
        <ExtraordinaryInvoiceModal
          onClose={() => setShowExtraModal(false)}
          onSuccess={() => { setShowExtraModal(false); reload(); }}
        />
      )}

      {actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-red-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-sm w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      {actionMessage && !actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-green-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-sm w-full">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}

