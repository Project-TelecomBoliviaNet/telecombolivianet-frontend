import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, MapPin, Wifi,
  ArrowLeft, PauseCircle, PlayCircle, UserX,
  CreditCard, Ticket, MessageSquare, Pencil,
  CheckCircle2, Clock, XCircle, Upload, Image, ChevronDown, ChevronUp,
  Banknote, Smartphone, Building2, QrCode, RefreshCw, Calendar,
  Paperclip, ClipboardList, Download, Trash2, X, ZoomIn,
} from 'lucide-react';
import {
  clientService, planService, planChangeService,
  getAttachments, uploadAttachment, deleteAttachment, downloadAttachment,
  getClientHistorial,
  TIPO_DOC_LABELS, TIPO_DOC_ICONS,
  type ClientAttachmentDto, type ClientActivityItemDto, type ClientHistorialDto,
} from '@/services/clientService';
import { paymentService } from '@/services/paymentService';
import { ticketService } from '@/services/ticketService';
import { userService } from '@/services/userService';
import type { TicketListItemDto } from '@/types/ticket.types';
import { PaymentModal } from '@/components/clients/PaymentModal';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { useAuthStore } from '@/store/authStore';
import { useTicketModal } from '@/hooks/useTicketModal';
import { extractApiError } from '@/utils/apiError';
import type {
  ClientDetailDto, InvoiceGridDto, InvoiceDto, PaymentSummaryDto,
  ClientQrInfoDto, PlanDto, PlanChangeRequestDto, PlanChangeHistorialDto,
} from '@/types/client.types';
import type { UserSystemDto } from '@/types/auth.types';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import { usePageTitle } from '@/hooks/usePageTitle';


// ── QR Tab ────────────────────────────────────────────────────────────────────

function QrTabPanel({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const [qrInfo,    setQrInfo]    = useState<ClientQrInfoDto | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expires,   setExpires]   = useState(30);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQrInfo(await clientService.getQrInfo(clientId));
    } catch {
      setQrInfo(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');
    try {
      await clientService.uploadQr(clientId, file, expires);
      setSuccess('QR subido correctamente.');
      load();
    } catch {
      setError('Error al subir el QR. Verifica el archivo (JPG, PNG, WebP, máx 3 MB).');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="card p-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* QR actual */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> QR activo
        </h3>
        {qrInfo ? (
          <div className="space-y-3">
            <img
              src={qrInfo.ImageUrl}
              alt="QR de pago"
              className="w-48 h-48 object-contain border rounded-lg mx-auto"
              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
            />
            <div className="text-xs text-gray-500 space-y-1 text-center">
              <p>Subido: {new Date(qrInfo.UploadedAt).toLocaleDateString('es-BO')}</p>
              {qrInfo.ExpiresAt ? (
                <p className={`font-medium ${(qrInfo.DaysUntilExpiry ?? 0) <= 5 ? 'text-red-600' : 'text-gray-600'}`}>
                  Vence: {new Date(qrInfo.ExpiresAt).toLocaleDateString('es-BO')}
                  {qrInfo.DaysUntilExpiry !== null && ` (${qrInfo.DaysUntilExpiry} días)`}
                </p>
              ) : (
                <p className="text-green-600">Sin fecha de vencimiento</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Sin QR activo
          </div>
        )}
      </div>

      {/* Subir nuevo QR */}
      {isAdmin && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Subir nuevo QR
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Días hasta vencimiento (0 = sin vencimiento)
              </label>
              <input
                type="number" min={0} max={365} value={expires}
                onChange={(e) => setExpires(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              {uploading
                ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                : <Upload className="w-6 h-6 text-gray-400" />}
              <span className="text-sm text-gray-500">
                {uploading ? 'Subiendo...' : 'Seleccionar imagen QR'}
              </span>
              <span className="text-xs text-gray-400">JPG, PNG o WebP — máx. 3 MB</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
            {error   && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan Change Tab ───────────────────────────────────────────────────────────

function PlanChangeTabPanel({
  clientId, currentPlanId, currentPlanName, isAdmin, onPlanChanged,
}: {
  clientId: string;
  currentPlanId: string;
  currentPlanName: string;
  isAdmin: boolean;
  onPlanChanged: () => void;
}) {
  const [plans,        setPlans]        = useState<PlanDto[]>([]);
  const [pending,      setPending]      = useState<PlanChangeRequestDto[]>([]);
  const [historial,    setHistorial]    = useState<PlanChangeHistorialDto[]>([]);
  const [newPlan,      setNewPlan]      = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [rejectingId,  setRejectingId]  = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPlans, pendingList, historialList] = await Promise.all([
        planService.getAll(true),
        planChangeService.getPending(clientId),
        planChangeService.getHistorial(clientId),
      ]);
      setPlans(allPlans.filter((p: PlanDto) => p.Id !== currentPlanId));
      setPending(pendingList);
      setHistorial(historialList);
    } catch {
      setError('Error cargando datos.');
    } finally {
      setLoading(false);
    }
  }, [clientId, currentPlanId]);

  useEffect(() => { load(); }, [load]);

  const handleSolicitar = async () => {
    if (!newPlan) { setError('Selecciona un plan.'); return; }
    setSending(true); setError(''); setSuccess('');
    try {
      await planChangeService.request(clientId, newPlan, notes || undefined);
      setSuccess('Solicitud enviada. El admin la revisará.');
      setNewPlan(''); setNotes('');
      load();
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al enviar la solicitud.'));
    } finally {
      setSending(false);
    }
  };

  const handleAprobar = async (id: string, midMonth: boolean) => {
    try {
      await planChangeService.approve(id, midMonth);
      setSuccess(midMonth ? 'Cambio aplicado inmediatamente.' : 'Aprobado. Efectivo el 1ro del mes.');
      onPlanChanged();
      load();
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al aprobar.'));
    }
  };

  const handleRechazar = async (id: string) => {
    if (rejectMotivo.trim().length < 3) return;
    try {
      await planChangeService.reject(id, rejectMotivo);
      setSuccess('Solicitud rechazada.');
      setRejectingId(null); setRejectMotivo('');
      onPlanChanged();
      load();
    } catch {
      setError('Error al rechazar.');
    }
  };

  if (loading) return <div className="card p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Plan actual */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Plan actual
        </h3>
        <p className="text-sm text-gray-700 font-medium">{currentPlanName}</p>
      </div>

      {/* Solicitar cambio */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Solicitar cambio de plan
        </h3>
        <div className="space-y-3">
          {/* Aviso: solicitud pendiente existente */}
          {pending.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ya existe una solicitud pendiente de cambio de plan.
                Debe ser aprobada o rechazada por el administrador antes de poder enviar una nueva.
              </span>
            </div>
          )}

          {/* Aviso: sin planes disponibles */}
          {plans.length === 0 && pending.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No hay otros planes disponibles para seleccionar. Contacta al administrador.</span>
            </div>
          )}

          {plans.length > 0 && pending.length === 0 && (
            <>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Seleccionar nuevo plan...</option>
                {plans.map((p) => (
                  <option key={p.Id} value={p.Id}>
                    {p.Name} — {p.SpeedMb} Mb — Bs. {p.MonthlyPrice}/mes
                  </option>
                ))}
              </select>
              <textarea
                rows={2}
                placeholder="Notas opcionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {error   && <p className="text-xs text-red-600">{error}</p>}
              {success && <p className="text-xs text-green-600">{success}</p>}
              <button
                onClick={handleSolicitar}
                disabled={sending || !newPlan}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sending && <Loader2 className="w-3 h-3 animate-spin" />}
                Enviar solicitud
              </button>
              <p className="text-xs text-gray-400">
                Los cambios son efectivos el 1ro del mes siguiente. El admin puede aprobar inmediatamente con factura proporcional.
              </p>
            </>
          )}

          {error && pending.length === 0 && plans.length === 0 && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          {success && <p className="text-xs text-green-600">{success}</p>}
        </div>
      </div>

      {/* Solicitudes pendientes (solo admin) */}
      {isAdmin && pending.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Solicitudes pendientes
          </h3>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.Id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{r.PlanAnterior} → {r.PlanNuevo}</span>
                  <span className="text-xs text-gray-400">{new Date(r.SolicitadoAt).toLocaleDateString('es-BO')}</span>
                </div>
                {r.Notes && <p className="text-xs text-gray-500 mb-2">{r.Notes}</p>}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleAprobar(r.Id, false)}
                    className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-lg hover:bg-green-200"
                  >
                    Aprobar (fin de mes)
                  </button>
                  <button
                    onClick={() => handleAprobar(r.Id, true)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg hover:bg-blue-200"
                  >
                    Aplicar ahora (proporcional)
                  </button>
                  {rejectingId !== r.Id && (
                    <button
                      onClick={() => { setRejectingId(r.Id); setRejectMotivo(''); }}
                      className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200"
                    >
                      Rechazar
                    </button>
                  )}
                </div>
                {rejectingId === r.Id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={2}
                      className="border rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                      placeholder="Motivo del rechazo (mínimo 3 caracteres)..."
                      value={rejectMotivo}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectMotivo(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRechazar(r.Id)}
                        disabled={rejectMotivo.trim().length < 3}
                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 disabled:opacity-40"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectMotivo(''); }}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIX-F: Historial completo de cambios de plan */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Historial de cambios de plan
        </h3>
        {historial.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">Sin historial de cambios.</p>
        ) : (
          <div className="space-y-2">
            {historial.map((h) => {
              const statusCls =
                h.Status === 'Aprobado'   ? 'bg-green-100 text-green-800' :
                h.Status === 'Rechazado'  ? 'bg-red-100 text-red-700'     :
                h.Status === 'Cancelado'  ? 'bg-gray-100 text-gray-500'   :
                                            'bg-amber-100 text-amber-800';
              return (
                <div key={h.Id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {h.PlanAnterior} → {h.PlanNuevo}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls}`}>
                      {h.Status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span>Solicitado: {new Date(h.SolicitadoAt).toLocaleDateString('es-BO')}</span>
                    <span>Efectivo: {new Date(h.FechaEfectiva).toLocaleDateString('es-BO')}</span>
                    {h.MidMonthChange && <span className="text-blue-600">Cambio inmediato</span>}
                    {h.ProcesadoAt && (
                      <span>Procesado: {new Date(h.ProcesadoAt).toLocaleDateString('es-BO')}</span>
                    )}
                  </div>
                  {h.MotivoRechazo && (
                    <p className="text-xs text-red-600 mt-1">Motivo: {h.MotivoRechazo}</p>
                  )}
                  {h.Notes && (
                    <p className="text-xs text-gray-400 italic">{h.Notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────
const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusCellClass(status: string) {
  const cls: Record<string, string> = {
    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    Pagada:    'bg-green-50 text-green-700 border-green-200',
    Vencida:   'bg-red-50 text-red-700 border-red-200',
    Anulada:   'bg-gray-100 text-gray-400 border-gray-200',
  };
  return cls[status] ?? 'bg-gray-50 text-gray-400 border-gray-100';
}

function statusIcon(status: string) {
  if (status === 'Pagada')  return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'Vencida') return <XCircle className="w-3 h-3" />;
  if (status === 'Pendiente') return <Clock className="w-3 h-3" />;
  return null;
}

function methodIcon(method: string) {
  if (method === 'Efectivo')         return <Banknote className="w-3.5 h-3.5" />;
  if (method === 'QR')               return <Smartphone className="w-3.5 h-3.5" />;
  if (method === 'DepositoBancario') return <Building2 className="w-3.5 h-3.5" />;
  return null;
}

function methodLabel(method: string) {
  const m: Record<string, string> = {
    Efectivo: 'Efectivo', QR: 'QR', DepositoBancario: 'Depósito',
  };
  return m[method] ?? method;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Activo: 'badge-active', Suspendido: 'badge-blocked', DadoDeBaja: 'badge-inactive',
  };
  const labels: Record<string, string> = {
    Activo: 'Activo', Suspendido: 'Suspendido', DadoDeBaja: 'Dado de baja',
  };
  return <span className={map[s] ?? 'badge-inactive'}>{labels[s] ?? s}</span>;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2 flex justify-between text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-xs">{value ?? '—'}</span>
    </div>
  );
}

// ── Celda de factura en el grid ───────────────────────────────────────────────
function InvoiceCell({
  label, invoice, onClick,
}: {
  label: string;
  invoice: InvoiceDto;
  onClick?: () => void;
}) {
  const canPay = invoice.Status === 'Pendiente' || invoice.Status === 'Vencida';
  return (
    <div
      onClick={canPay ? onClick : undefined}
      title={invoice.Notes ?? undefined}
      className={`rounded-lg border p-2 text-center transition-all
        ${statusCellClass(invoice.Status)}
        ${canPay ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1' : 'cursor-default'}`}
    >
      <p className="text-xs font-medium leading-none mb-1">{label}</p>
      <div className="flex items-center justify-center gap-0.5 mb-0.5">
        {statusIcon(invoice.Status)}
        <p className="text-xs">{invoice.Status}</p>
      </div>
      <p className="text-xs opacity-75">Bs.{invoice.Amount}</p>
      {invoice.Notes && (
        <p className="text-xs opacity-60 mt-0.5 truncate" title={invoice.Notes}>
          {invoice.Notes}
        </p>
      )}
    </div>
  );
}

// ── Grid de facturas ──────────────────────────────────────────────────────────
function InvoiceGrid({
  grid, onPayInvoice, year, setYear,
}: {
  grid: InvoiceGridDto;
  onPayInvoice: (invoiceId: string) => void;
  year: number;
  setYear: (y: number) => void;
}) {
  const invoiceByMonth = (month: number) =>
    grid.Invoices.find(i => i.Month === month && i.Year === year && i.Type === 'Mensualidad');
  const installInvoice = grid.Invoices.find(i => i.Type === 'Instalacion');

  return (
    <div>
      {/* Selector año + resumen deuda */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(year - 1)}
            className="btn-secondary px-2 py-1 text-xs">◀</button>
          <span className="text-sm font-semibold text-gray-900 w-10 text-center">{year}</span>
          <button onClick={() => setYear(year + 1)}
            disabled={year >= new Date().getFullYear()}
            className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">▶</button>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          {grid.TotalDebt > 0 && (
            <span className="text-red-600 font-medium">
              Deuda total: Bs. {grid.TotalDebt.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
            </span>
          )}
          {grid.PendingMonths > 0 && <span>{grid.PendingMonths} meses pendientes</span>}
          {grid.LastPaymentDate && (
            <span>Último pago: {new Date(grid.LastPaymentDate).toLocaleDateString('es-BO')}</span>
          )}
        </div>
      </div>

      {/* Nota explicativa sobre estados */}
      <div className="flex gap-3 text-xs text-gray-400 mb-3 flex-wrap">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Pagada</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Pendiente (dentro del plazo)</span>
        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Vencida (mora activa)</span>
        <span className="text-blue-500 ml-auto">Clic en una celda pendiente/vencida para registrar pago</span>
      </div>

      {/* Grid de 12 meses */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-13 gap-1.5 mb-4">
        {installInvoice && (
          <InvoiceCell
            label="Inst."
            invoice={installInvoice}
            onClick={() => onPayInvoice(installInvoice.Id)}
          />
        )}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const inv = invoiceByMonth(m);
          return inv ? (
            <InvoiceCell
              key={m}
              label={MONTH_SHORT[m]}
              invoice={inv}
              onClick={() => onPayInvoice(inv.Id)}
            />
          ) : (
            <div key={m} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-center">
              <p className="text-xs text-gray-400 font-medium">{MONTH_SHORT[m]}</p>
              <p className="text-xs text-gray-300 mt-0.5">—</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Historial de pagos del cliente ────────────────────────────────────────────
function ReceiptImageViewer({ url, paymentId, expanded, onToggle }: {
  url: string; paymentId: string; expanded: boolean; onToggle: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div className="mt-2">
        <button onClick={onToggle}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <Image className="w-3 h-3" />
          {expanded ? 'Ocultar comprobante' : 'Ver comprobante'}
        </button>
        {expanded && (
          <div className="mt-2">
            {isPdf ? (
              <a href={url} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 underline">Abrir PDF</a>
            ) : (
              <div className="relative group inline-block cursor-zoom-in"
                onClick={() => setLightbox(true)}>
                <img src={url} alt="Comprobante"
                  className="rounded border border-gray-200 max-h-48 object-contain block" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 rounded transition-colors">
                  <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div ref={overlayRef}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
          onClick={e => { if (e.target === overlayRef.current) setLightbox(false); }}>
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <img src={url} alt="Comprobante"
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain select-none" />
        </div>
      )}
    </>
  );
}

function PaymentHistory({
  payments, onVoidPayment, isAdmin,
}: {
  payments: PaymentSummaryDto[];
  onVoidPayment: (id: string) => void;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No hay pagos registrados para este cliente.
      </p>
    );
  }

  const visible = expanded ? payments : payments.slice(0, 4);

  return (
    <div>
      <div className="space-y-2">
        {visible.map(p => (
          <div key={p.Id}
            className={`rounded-lg border p-3 text-sm ${p.IsVoided ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-100'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {methodIcon(p.Method)}
                <span className="font-semibold text-gray-900">
                  Bs. {p.Amount.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-gray-500">{methodLabel(p.Method)}</span>
                {p.Bank && <span className="text-xs text-gray-400">· {p.Bank}</span>}
                {p.FromWhatsApp && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    WhatsApp
                  </span>
                )}
                {p.IsVoided && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    Anulado
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 text-right shrink-0">
                <p>{new Date(p.PaidAt).toLocaleDateString('es-BO')}</p>
                <p>por {p.RegisteredByName}</p>
              </div>
            </div>

            {p.CoveredMonths.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Cubre: {p.CoveredMonths.join(' · ')}
              </p>
            )}

            {/* Comprobante adjunto */}
            {p.ReceiptImageUrl && (
              <ReceiptImageViewer url={p.ReceiptImageUrl} paymentId={p.Id}
                expanded={expandedReceipt === p.Id}
                onToggle={() => setExpandedReceipt(expandedReceipt === p.Id ? null : p.Id)} />
            )}

            {/* Subir comprobante si no tiene */}
            {!p.ReceiptImageUrl && !p.IsVoided && (
              <ReceiptUploadInline paymentId={p.Id} />
            )}

            {/* Anular pago */}
            {isAdmin && p.CanVoid && !p.IsVoided && (
              <button
                onClick={() => onVoidPayment(p.Id)}
                className="mt-2 text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Anular este pago
              </button>
            )}
          </div>
        ))}
      </div>

      {payments.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-1">
          {expanded
            ? <><ChevronUp className="w-3 h-3" /> Ver menos</>
            : <><ChevronDown className="w-3 h-3" /> Ver {payments.length - 4} pagos más</>}
        </button>
      )}
    </div>
  );
}

// ── Upload de comprobante inline ──────────────────────────────────────────────
function ReceiptUploadInline({ paymentId }: { paymentId: string }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr('Máximo 5 MB'); return; }
    setUploading(true); setErr('');
    try {
      await paymentService.uploadReceiptImage(paymentId, file);
      setDone(true);
    } catch {
      setErr('Error al subir. Intenta de nuevo.');
    } finally { setUploading(false); }
  };

  if (done) return <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Comprobante subido</p>;

  return (
    <label className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 cursor-pointer">
      {uploading
        ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</>
        : <><Upload className="w-3 h-3" /> Adjuntar comprobante</>}
      <input type="file" className="hidden" accept="image/jpeg,image/png,application/pdf"
        onChange={handleFile} disabled={uploading} />
      {err && <span className="text-red-500 ml-1">{err}</span>}
    </label>
  );
}

// ── Modal anular pago ─────────────────────────────────────────────────────────
function VoidPaymentModal({
  onConfirm, onClose,
}: {
  paymentId?: string;
  onConfirm: (justif: string) => Promise<void>;
  onClose: () => void;
}) {
  const [justif, setJustif] = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const ok = justif.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Anular pago</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            Las facturas cubiertas volverán a estado pendiente/vencida.
            Solo disponible en los 30 días posteriores al registro.
          </p>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div>
            <label className="label">Justificación (mínimo 10 caracteres)</label>
            <textarea rows={3} className="input-field resize-none"
              value={justif} onChange={e => setJustif(e.target.value)}
              placeholder="Ej: Error de registro, el cliente no realizó este pago..." />
            <p className="text-xs text-gray-400 mt-1">{justif.trim().length}/10</p>
          </div>
          <div className="flex gap-3">
            <button
              disabled={!ok || saving}
              onClick={async () => {
                setSaving(true); setErr('');
                try { await onConfirm(justif); onClose(); }
                catch (e: unknown) {
                  setErr(extractApiError(e, 'Error al anular.'));
                }
                finally { setSaving(false); }
              }}
              className="btn-danger flex-1 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Anulando...' : 'Confirmar anulación'}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientProfilePage() {
  usePageTitle('Perfil de Cliente');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useAuthStore(s => s.isAdmin); // FIX-25

  const [client,  setClient]  = useState<ClientDetailDto | null>(null);
  const [tab,     setTab]     = useState<'info' | 'billing' | 'tickets' | 'messages' | 'plan' | 'adjuntos' | 'historial'>('info');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [grid,    setGrid]    = useState<InvoiceGridDto | null>(null);
  const [gridYear, setGridYear] = useState(new Date().getFullYear());
  const [gridLoading, setGridLoading] = useState(false);

  // Modales
  const [paymentModal,   setPaymentModal]   = useState<string | null>(null); // invoiceId preselected
  const [voidPaymentId,  setVoidPaymentId]  = useState<string | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const [actionError,    setActionError]    = useState('');

  // Modal de detalle de ticket
  const { ticket: selectedTicket, loading: ticketLoading, openTicket, closeTicket, refreshTicket } = useTicketModal();
  const [technicians, setTechnicians] = useState<UserSystemDto[]>([]);

  const openConfirm  = (s: Omit<ConfirmState, 'open'>) => setConfirmDialog({ ...s, open: true });
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };
  const runConfirm   = async (fn: () => Promise<void>) => {
    setConfirmRunning(true);
    try { await fn(); } finally { setConfirmRunning(false); }
  };

  const loadClient = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const clientData = await clientService.getById(id);
      setClient(clientData);
    } catch { setError('No se pudo cargar el perfil del cliente.'); }
    finally { setLoading(false); }
  }, [id]);

  const loadGrid = useCallback(async () => {
    if (!id) return;
    setGridLoading(true);
    try {
      const gridData = await clientService.getInvoices(id, gridYear);
      setGrid(gridData);
    } catch { /* silencioso */ }
    finally { setGridLoading(false); }
  }, [id, gridYear]);

  useEffect(() => { loadClient(); }, [loadClient]);
  useEffect(() => {
    if (tab === 'billing') loadGrid();
  }, [tab, loadGrid]);

  const exportStatementPdf = () => {
    if (!client || !grid) return;
    const fmtMethod = (m: string) =>
      ({ Efectivo: 'Efectivo', DepositoBancario: 'Depósito Bancario', QR: 'QR' }[m] ?? m);

    const rows = grid.Payments.map(p => `
      <tr${p.IsVoided ? ' style="color:#9ca3af;text-decoration:line-through"' : ''}>
        <td>${new Date(p.PaidAt).toLocaleDateString('es-BO')}</td>
        <td>${new Date(p.RegisteredAt).toLocaleDateString('es-BO')}</td>
        <td>Bs. ${p.Amount.toFixed(2)}</td>
        <td>${fmtMethod(p.Method)}</td>
        <td>${p.Bank ?? '—'}</td>
        <td>${p.BankReference ?? '—'}</td>
        <td>${p.PhysicalReceiptNumber ?? '—'}</td>
        <td>${p.RegisteredByName}</td>
        <td>${p.FromWhatsApp ? 'WhatsApp' : 'Manual'}</td>
        <td>${p.IsVoided ? 'Anulado' : 'Válido'}</td>
        <td>${p.CoveredMonths.join(', ')}</td>
      </tr>`).join('');

    const totalPagado = grid.Payments
      .filter(p => !p.IsVoided)
      .reduce((s, p) => s + p.Amount, 0);

    const html = `<html><head><meta charset="utf-8"><title>Extracto — ${client.TbnCode}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:20px}
        h2{font-size:14px;margin:0 0 4px}
        .subtitle{font-size:11px;color:#6b7280;margin:0 0 12px}
        .info{display:flex;gap:32px;margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:4px}
        .info-group p{margin:2px 0}
        .info-group .label{color:#6b7280;font-size:9px;text-transform:uppercase}
        .info-group .val{font-size:11px;font-weight:600}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left}
        th{background:#1e3a8a;color:#fff;font-size:9px}
        .total{margin-top:10px;text-align:right;font-weight:bold;font-size:11px}
        .footer{margin-top:16px;font-size:8px;color:#9ca3af;text-align:center}
      </style></head><body>
      <h2>Extracto de Pagos — TelecomBoliviaNet</h2>
      <p class="subtitle">Generado: ${new Date().toLocaleString('es-BO')}</p>
      <div class="info">
        <div class="info-group">
          <p class="label">Cliente</p>
          <p class="val">${client.FullName}</p>
        </div>
        <div class="info-group">
          <p class="label">Código TBN</p>
          <p class="val">${client.TbnCode}</p>
        </div>
        <div class="info-group">
          <p class="label">Plan</p>
          <p class="val">${client.Plan?.Name ?? '—'}</p>
        </div>
        <div class="info-group">
          <p class="label">Zona</p>
          <p class="val">${client.Zone}</p>
        </div>
        <div class="info-group">
          <p class="label">Deuda actual</p>
          <p class="val" style="color:#dc2626">Bs. ${client.TotalDebt.toFixed(2)}</p>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Fecha Pago</th><th>Fecha Registro</th><th>Monto</th><th>Método</th>
          <th>Banco</th><th>Referencia</th><th>N° Comprobante</th>
          <th>Registrado por</th><th>Origen</th><th>Estado</th><th>Meses cubiertos</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">Total cobrado (pagos válidos): Bs. ${totalPagado.toFixed(2)}</p>
      <p class="footer">TelecomBoliviaNet · Cochabamba, Bolivia · Documento generado automáticamente</p>
      </body></html>`;

    const w = window.open('', '_blank');
    w?.document.write(html);
    w?.document.close();
    w?.print();
  };
  useEffect(() => {
    userService.getAll(1, 100)
      .then(res => setTechnicians(res.Items.filter((u: UserSystemDto) => u.Role === 'Admin' || u.Role === 'Tecnico')))
      .catch(() => { /* silencioso */ });
  }, []);

  const reload = () => { loadClient(); loadGrid(); };

  const handleSuspend = () => {
    if (!client) return;
    setActionError('');
    openConfirm({
      title: 'Suspender servicio', confirmLabel: 'Suspender', variant: 'warning',
      message: `¿Suspender el servicio de ${client.FullName}?`,
      onConfirm: () => runConfirm(async () => {
        try { await clientService.suspend(client.Id); closeConfirm(); loadClient(); }
        catch { setActionError('Error al suspender.'); closeConfirm(); }
      }),
    });
  };

  const handleReactivate = () => {
    if (!client) return;
    setActionError('');
    openConfirm({
      title: 'Reactivar servicio', confirmLabel: 'Reactivar', variant: 'warning',
      message: `¿Reactivar el servicio de ${client.FullName}?`,
      onConfirm: () => runConfirm(async () => {
        try { await clientService.reactivate(client.Id); closeConfirm(); loadClient(); }
        catch { setActionError('Error al reactivar.'); closeConfirm(); }
      }),
    });
  };

  const handleCancel = () => {
    if (!client) return;
    setActionError('');
    openConfirm({
      title: 'Dar de baja', confirmLabel: 'Dar de baja', variant: 'danger',
      message: `¿Dar de baja a ${client.FullName}?\nSus registros se conservarán.`,
      onConfirm: () => runConfirm(async () => {
        try {
          const res = await clientService.cancel(client.Id, false);
          if (res.requiresConfirmation) {
            closeConfirm();
            openConfirm({
              title: 'Cliente con deuda pendiente', confirmLabel: 'Confirmar baja', variant: 'danger',
              message: 'El cliente tiene deuda pendiente. ¿Dar de baja igualmente?',
              onConfirm: () => runConfirm(async () => {
                try { await clientService.cancel(client.Id, true); closeConfirm(); loadClient(); }
                catch { setActionError('Error al dar de baja.'); closeConfirm(); }
              }),
            });
          } else { closeConfirm(); loadClient(); }
        } catch { setActionError('Error al dar de baja.'); closeConfirm(); }
      }),
    });
  };

  const handleVoidPayment = async (justif: string) => {
    if (!voidPaymentId) return;
    await paymentService.voidPayment(voidPaymentId, justif);
    setVoidPaymentId(null);
    reload();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando perfil...
    </div>
  );

  if (error || !client) return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertCircle className="w-4 h-4" /> {error || 'Cliente no encontrado.'}
      </div>
    </div>
  );

  const TABS = [
    { key: 'info',     label: 'Información',    icon: <Wifi className="w-4 h-4" /> },
    { key: 'billing',  label: 'Facturación',    icon: <CreditCard className="w-4 h-4" /> },
    { key: 'plan',     label: 'Cambio de plan', icon: <Smartphone className="w-4 h-4" /> },
    { key: 'tickets',  label: 'Tickets',        icon: <Ticket className="w-4 h-4" /> },
    { key: 'messages',  label: 'Mensajes',       icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'adjuntos',  label: 'Documentos',     icon: <Paperclip className="w-4 h-4" /> },
    { key: 'historial', label: 'Historial',       icon: <ClipboardList className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/clients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </button>

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-xl font-bold text-blue-700 shrink-0">
              {client.FullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{client.FullName}</h1>
                {statusBadge(client.Status)}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-mono font-medium text-blue-700">{client.TbnCode}</span>
                {' · '}{client.PhoneMain}
                {' · '}{client.Plan?.Name}
                {' · '}{client.Zone}
              </p>
              {client.TotalDebt > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  Deuda: Bs. {client.TotalDebt.toLocaleString('es-BO')} ({client.PendingMonths} meses)
                </p>
              )}
              {/* US-PAG-CREDITO */}
              {(client.CreditBalance ?? 0) > 0 && (
                <p className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  Crédito a favor: Bs. {(client.CreditBalance ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {isAdmin() && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => navigate(`/clients/${client.Id}/edit`)}
                className="btn-secondary text-sm">
                <Pencil className="w-4 h-4" /> Editar
              </button>
              {client.Status === 'Activo' && (
                <button onClick={handleSuspend} className="btn-secondary text-sm text-amber-700">
                  <PauseCircle className="w-4 h-4" /> Suspender
                </button>
              )}
              {client.Status === 'Suspendido' && (
                <button onClick={handleReactivate} className="btn-secondary text-sm text-green-700">
                  <PlayCircle className="w-4 h-4" /> Reactivar
                </button>
              )}
              {client.Status !== 'DadoDeBaja' && (
                <button onClick={handleCancel} className="btn-danger text-sm">
                  <UserX className="w-4 h-4" /> Dar de baja
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Pestañas ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Pestaña: Información ───────────────────────────────────────────── */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Datos personales</h3>
            <InfoRow label="Nombre completo"    value={client.FullName} />
            <InfoRow label="Carnet identidad"   value={client.IdentityCard} />
            <InfoRow label="Teléfono principal" value={client.PhoneMain} />
            <InfoRow label="Teléfono secundario" value={client.PhoneSecondary} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Ubicación</h3>
            <InfoRow label="Zona / Barrio"  value={client.Zone} />
            <InfoRow label="Calle y número" value={client.Street} />
            <InfoRow label="Referencia"     value={client.LocationRef} />
            {client.GpsLatitude && client.GpsLongitude && (
              <div className="py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">Coordenadas</span>
                <a href={`https://maps.google.com/?q=${client.GpsLatitude},${client.GpsLongitude}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-xs mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {client.GpsLatitude}, {client.GpsLongitude} — Ver en mapa
                </a>
              </div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Servicio</h3>
            <InfoRow label="Plan"               value={client.Plan?.DisplayLabel} />
            <InfoRow label="TV cable"           value={client.HasTvCable ? 'Sí' : 'No'} />
            <InfoRow label="Winbox"             value={client.WinboxNumber} />
            <InfoRow label="Serie ONU"          value={client.OnuSerialNumber} />
            <InfoRow label="Fecha instalación"
              value={new Date(client.InstallationDate).toLocaleDateString('es-BO')} />
            <InfoRow label="Técnico instalador" value={client.InstalledByName} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen financiero</h3>
            <InfoRow label="Deuda total"
              value={`Bs. ${client.TotalDebt.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`} />
            <InfoRow label="Meses pendientes" value={String(client.PendingMonths)} />
            <InfoRow label="Último pago"
              value={client.LastPaymentDate
                ? new Date(client.LastPaymentDate).toLocaleDateString('es-BO')
                : 'Sin pagos'} />
            <InfoRow label="Instalación"
              value={client.InstallationPaid ? 'Pagada' : 'Pendiente'} />
            <InfoRow label="Registrado"
              value={new Date(client.CreatedAt).toLocaleDateString('es-BO')} />
          </div>
        </div>
      )}

      {/* ── Pestaña: Facturación (grid + pagos + comprobantes) ────────────── */}
      {tab === 'billing' && (
        <div className="space-y-5">

          {/* Grid de facturas */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Facturas por mes</h3>
              {isAdmin() && (
                <button
                  onClick={() => setPaymentModal('')}
                  className="btn-primary text-sm">
                  <CreditCard className="w-4 h-4" /> Registrar pago
                </button>
              )}
            </div>

            {gridLoading ? (
              <div className="flex items-center justify-center h-24 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
              </div>
            ) : grid ? (
              <InvoiceGrid
                grid={grid}
                onPayInvoice={invoiceId => setPaymentModal(invoiceId)}
                year={gridYear}
                setYear={y => { setGridYear(y); }}
              />
            ) : null}
          </div>

          {/* Historial de pagos */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Historial de pagos
                {grid && grid.Payments.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {grid.Payments.length} registros
                  </span>
                )}
              </h3>
              {grid && grid.Payments.length > 0 && (
                <button
                  onClick={exportStatementPdf}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  title="Generar extracto PDF con todos los pagos del cliente"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar extracto PDF
                </button>
              )}
            </div>
            {gridLoading ? (
              <div className="flex items-center justify-center h-16 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
              </div>
            ) : grid ? (
              <PaymentHistory
                payments={grid.Payments}
                onVoidPayment={id => setVoidPaymentId(id)}
                isAdmin={isAdmin()}
              />
            ) : null}
          </div>

        </div>
      )}

      {/* ── Pestaña: Cambio de plan ────────────────────────────────────────── */}
      {tab === 'plan' && (
        <PlanChangeTabPanel clientId={client.Id} currentPlanId={client.Plan?.Id ?? ''} currentPlanName={client.Plan?.Name ?? '—'} isAdmin={isAdmin()} onPlanChanged={loadClient} />
      )}

      {/* ── Pestaña: Tickets ───────────────────────────────────────────────── */}
      {tab === 'tickets' && (
        <ClientTicketsTab clientId={client.Id} onOpenTicket={openTicket} />
      )}

      {/* ── Pestaña: Mensajes WhatsApp ─────────────────────────────────────── */}
      {tab === 'messages' && (
        <ClientChatHistoryTab phone={client.PhoneMain} />
      )}

      {tab === 'adjuntos' && (
        <AttachmentsTab clientId={client.Id} isAdmin={isAdmin()} />
      )}

      {tab === 'historial' && (
        <HistorialTab clientId={client.Id} />
      )}

      {/* ── Modal: Registrar pago ──────────────────────────────────────────── */}
      {paymentModal !== null && grid && (
        <PaymentModal
          clientId={client.Id}
          invoices={grid.Invoices}
          preselected={paymentModal || undefined}
          onSuccess={() => { setPaymentModal(null); reload(); }}
          onClose={() => setPaymentModal(null)}
        />
      )}

      {/* ── Modal: Anular pago ─────────────────────────────────────────────── */}
      {voidPaymentId && (
        <VoidPaymentModal
          paymentId={voidPaymentId}
          onConfirm={handleVoidPayment}
          onClose={() => setVoidPaymentId(null)}
        />
      )}

      {actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-red-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-sm w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Modal: Detalle de ticket ───────────────────────────────────────── */}
      {ticketLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          technicians={technicians}
          isAdmin={isAdmin()}
          onClose={closeTicket}
          onRefresh={() => refreshTicket(selectedTicket.Id)}
        />
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// US-CLI-ADJUNTOS — Tab de documentos adjuntos
// ════════════════════════════════════════════════════════════════════════════

function AttachmentsTab({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const [attachments,    setAttachments]    = useState<ClientAttachmentDto[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };
  const [tipoDoc, setTipoDoc]         = useState('Otro');
  const [descripcion, setDescripcion] = useState('');
  const fileRef                       = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAttachments(await getAttachments(clientId));
    } catch { setError('Error al cargar adjuntos.'); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError('El archivo no puede superar 5 MB.'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF.'); return; }
    setUploading(true); setError(null);
    try {
      await uploadAttachment(clientId, file, tipoDoc, descripcion || undefined);
      setSuccess('Archivo subido correctamente.');
      setDescripcion('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error al subir el archivo.'));
    } finally { setUploading(false); }
  };

  const handleDelete = (att: ClientAttachmentDto) => {
    setConfirmDialog({
      open: true, variant: 'danger',
      title: 'Eliminar documento',
      message: `¿Eliminar "${att.FileName}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          await deleteAttachment(clientId, att.Id);
          setAttachments(prev => prev.filter(a => a.Id !== att.Id));
          setSuccess('Adjunto eliminado.');
          closeConfirm();
        } catch {
          setError('Error al eliminar.');
          closeConfirm();
        }
      },
    });
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  if (loading) return <div className="card p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Upload form */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-600" /> Subir documento
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de documento</label>
            <select
              value={tipoDoc}
              onChange={e => setTipoDoc(e.target.value)}
              className="input-field text-sm"
            >
              {Object.entries(TIPO_DOC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{TIPO_DOC_ICONS[k]} {v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: CI vigente 2026"
              className="input-field text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
          <span className="text-xs text-gray-400">JPG, PNG, WebP, PDF, DOCX — máx 10 MB</span>
        </div>
      </div>

      {/* List */}
      {attachments.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No hay documentos adjuntos para este cliente.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.Id} className="card p-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">{TIPO_DOC_ICONS[att.TipoDoc] ?? '📎'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{att.FileName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{TIPO_DOC_LABELS[att.TipoDoc] ?? att.TipoDoc}</span>
                  {att.Descripcion && <><span>·</span><span className="truncate">{att.Descripcion}</span></>}
                  <span>·</span><span>{fmtSize(att.FileSizeBytes)}</span>
                  <span>·</span><span>{new Date(att.SubidoAt).toLocaleDateString('es-BO')}</span>
                  <span>·</span><span>{att.SubidoPorNombre}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => downloadAttachment(clientId, att.Id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// US-CLI-HISTORIAL — Tab de historial cronológico
// ════════════════════════════════════════════════════════════════════════════

const TIPO_HISTORIAL_OPTIONS = [
  { value: '',            label: 'Todos' },
  { value: 'Pago',        label: 'Pagos' },
  { value: 'Factura',     label: 'Facturas' },
  { value: 'Ticket',      label: 'Tickets' },
  { value: 'Notif',       label: 'Notificaciones' },
  { value: 'Estado',      label: 'Cambios de estado' },
  { value: 'Admin',       label: 'Acciones admin' },
  { value: 'Adjunto',     label: 'Documentos' },
  { value: 'CambioPlan',  label: 'Cambios de plan' },
];

const TIPO_COLORS: Record<string, string> = {
  Pago:       'bg-green-100 text-green-700',
  Factura:    'bg-blue-100 text-blue-700',
  Ticket:     'bg-orange-100 text-orange-700',
  Notif:      'bg-purple-100 text-purple-700',
  Estado:     'bg-amber-100 text-amber-700',
  Admin:      'bg-gray-100 text-gray-600',
  Adjunto:    'bg-indigo-100 text-indigo-700',
  CambioPlan: 'bg-cyan-100 text-cyan-700',
};

function HistorialTab({ clientId }: { clientId: string }) {
  const [data, setData]       = useState<ClientHistorialDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [tipo, setTipo]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getClientHistorial(clientId, page, 25, tipo || undefined));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [clientId, page, tipo]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const totalPages = data ? Math.ceil(data.Total / 25) : 0;

  return (
    <div className="space-y-3">
      {/* Filtro por tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIPO_HISTORIAL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setTipo(opt.value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              tipo === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : !data || data.Items.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No hay actividad registrada{tipo ? ` para el tipo "${tipo}"` : ''}.
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-3 pl-10">
              {data.Items.map((item: ClientActivityItemDto) => (
                <div key={item.Id} className="relative">
                  {/* Dot */}
                  <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white mt-1.5 ${
                    TIPO_COLORS[item.Tipo]?.includes('green')   ? 'bg-green-500' :
                    TIPO_COLORS[item.Tipo]?.includes('blue')    ? 'bg-blue-500'  :
                    TIPO_COLORS[item.Tipo]?.includes('orange')  ? 'bg-orange-500':
                    TIPO_COLORS[item.Tipo]?.includes('purple')  ? 'bg-purple-500':
                    TIPO_COLORS[item.Tipo]?.includes('amber')   ? 'bg-amber-500' :
                    TIPO_COLORS[item.Tipo]?.includes('indigo')  ? 'bg-indigo-500':
                    TIPO_COLORS[item.Tipo]?.includes('cyan')    ? 'bg-cyan-500'  :
                    'bg-gray-400'
                  }`} />
                  <div className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[item.Tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                            {item.Tipo}
                          </span>
                          <span className="text-xs text-gray-400">{item.Actor}</span>
                        </div>
                        <p className="text-sm text-gray-800 leading-snug">{item.Descripcion}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 font-mono">
                        {fmtDate(item.OcurridoAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                {data.Total} eventos · página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  ← Anterior
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Tab: Tickets del cliente
// ════════════════════════════════════════════════════════════════════════════

function ClientTicketsTab({ clientId, onOpenTicket }: { clientId: string; onOpenTicket: (id: string) => void }) {
  const [tickets, setTickets]   = useState<TicketListItemDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(false);

  useEffect(() => {
    ticketService.getByClient(clientId)
      .then(setTickets)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [clientId]);

  const STATUS_COLOR: Record<string, string> = {
    Abierto:   'bg-blue-100 text-blue-800',
    EnProceso: 'bg-amber-100 text-amber-800',
    Resuelto:  'bg-green-100 text-green-800',
    Cerrado:   'bg-gray-100 text-gray-600',
  };

  const PRIORITY_COLOR: Record<string, string> = {
    Critica: 'bg-red-100 text-red-800',
    Alta:    'bg-orange-100 text-orange-800',
    Media:   'bg-yellow-100 text-yellow-800',
    Baja:    'bg-gray-100 text-gray-600',
  };

  if (loading) return (
    <div className="card p-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="card p-6 flex items-center gap-2 text-red-600 text-sm">
      <AlertCircle className="w-4 h-4" />
      No se pudo cargar los tickets del cliente.
    </div>
  );

  if (tickets.length === 0) return (
    <div className="card p-8 text-center text-gray-400 text-sm">
      Este cliente no tiene tickets registrados.
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Asunto</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridad</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Asignado a</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.map((t) => (
            <tr
              key={t.Id}
              onClick={() => onOpenTicket(t.Id)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                {t.TicketNumber ?? t.Id.slice(0, 8)}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 truncate max-w-xs">{t.Subject}</p>
                <p className="text-xs text-gray-400">{t.Type}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[t.Priority] ?? 'bg-gray-100 text-gray-600'}`}>
                  {t.Priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[t.Status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {t.Status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {t.AssignedToName ?? <span className="text-amber-600">Sin asignar</span>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(t.CreatedAt).toLocaleDateString('es-BO')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// M10 — US-BOT-07: Historial de conversaciones WhatsApp del cliente
// ════════════════════════════════════════════════════════════════════════════

import { chatbotService, type ClientConversationHistoryDto, type ConversationMessageDto } from '@/services/chatbotService';

function ClientChatHistoryTab({ phone }: { phone: string }) {
  const [history, setHistory] = useState<ClientConversationHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  // índice de la conversación seleccionada (la más reciente por defecto)
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    chatbotService.getClientHistory(phone)
      .then(h => { setHistory(h); setSelected(0); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [phone]);

  const fmtTime = (d: string) =>
    new Date(d).toLocaleString('es-BO', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  if (loading) return (
    <div className="card p-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="card p-8 text-center text-gray-400 text-sm">
      Error al cargar el historial de conversaciones. Verifica que el servicio de chatbot esté activo.
    </div>
  );

  if (!history || history.Conversaciones.length === 0) return (
    <div className="card p-8 text-center text-gray-400 text-sm">
      Este cliente no tiene conversaciones registradas por WhatsApp.
    </div>
  );

  const conv = history.Conversaciones[selected];

  return (
    <div className="space-y-3">
      {/* Selector de conversación si hay más de una */}
      {history.Conversaciones.length > 1 && (
        <div className="card p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            {history.Conversaciones.length} conversaciones — selecciona una:
          </p>
          <div className="flex flex-wrap gap-2">
            {history.Conversaciones.map((c, i) => (
              <button
                key={c.Id}
                onClick={() => setSelected(i)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  i === selected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {new Date(c.UpdatedAt).toLocaleDateString('es-BO')}
                {c.TotalMessages > 0 && ` · ${c.TotalMessages} msgs`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detalle de la conversación seleccionada */}
      <ConversationThread conv={conv} fmtTime={fmtTime} />
    </div>
  );
}

function ConversationThread({
  conv, fmtTime,
}: {
  conv: ClientConversationHistoryDto['Conversaciones'][number];
  fmtTime: (d: string) => string;
}) {
  const [messages,  setMessages]  = useState<ConversationMessageDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    chatbotService.getConversacion(conv.PhoneNumber)
      .then(detail => setMessages(detail.Messages))
      .catch(() => { setMessages([]); setLoadError(true); })
      .finally(() => setLoading(false));
  }, [conv.PhoneNumber]);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Historial WhatsApp — {conv.PhoneNumber}
          {conv.IsEscalated && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
              Escalada {conv.AgentName ? `→ ${conv.AgentName}` : ''}
            </span>
          )}
        </p>
        <span className="text-xs text-gray-400">{conv.TotalMessages} mensajes</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      ) : loadError ? (
        <p className="text-xs text-red-400 text-center py-4">
          Error al cargar los mensajes. Verifica que el servicio de chatbot esté activo.
        </p>
      ) : messages.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Sin mensajes en esta conversación.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2 bg-[#efeae2] rounded-lg p-3">
          {messages.map(msg => {
            const isUser = msg.Role === 'user';
            return (
              <div key={msg.Id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm text-sm ${
                  isUser ? 'bg-white text-gray-800' : 'bg-[#dcf8c6] text-gray-800'
                }`}>
                  {msg.Role === 'bot' && (
                    <p className="text-xs text-gray-400 mb-0.5">Bot</p>
                  )}
                  {msg.Role === 'admin' && (
                    <p className="text-xs text-blue-500 mb-0.5">Agente</p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.Content}</p>
                  <p className="text-right text-xs text-gray-400 mt-0.5">{fmtTime(msg.CreatedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
