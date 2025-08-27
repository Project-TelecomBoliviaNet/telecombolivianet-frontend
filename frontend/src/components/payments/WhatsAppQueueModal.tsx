import { useState, useEffect, useRef } from 'react';
import { Loader2, X, XCircle, Check, ImageOff, ZoomIn, UserPlus } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { clientService } from '@/services/clientService';
import type { WhatsAppReceiptDto } from '@/types/payment.types';
import type { InvoiceDto } from '@/types/client.types';
import { PaymentModal } from '@/components/clients/PaymentModal';

interface Props {
  receipt:     WhatsAppReceiptDto;
  onProcessed: () => void;
  onClose:     () => void;
}

export function WhatsAppQueueModal({ receipt, onProcessed, onClose }: Props) {
  const [action,         setAction]         = useState<'approve' | 'reject' | 'discard' | 'assign' | null>(null);
  const [reason,         setReason]         = useState('');
  const [loading,        setLoading]        = useState(false);
  const [localError,     setLocalError]     = useState('');
  const [clientInvoices, setClientInvoices] = useState<InvoiceDto[]>([]);
  const [assignPhone,    setAssignPhone]    = useState('');
  const [foundClient,    setFoundClient]    = useState<{ Id: string; FullName: string; TbnCode: string } | null>(null);
  const [searchErr,      setSearchErr]      = useState('');
  const [imgError,       setImgError]       = useState(false);
  const [lightbox,       setLightbox]       = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Detecta recibo físico en efectivo: el chatbot prefija OcrRawText con [RECIBO_EFECTIVO]
  // y lo almacena en MessageText cuando no hay caption del usuario.
  const isCashReceipt = receipt.MessageText?.includes('[RECIBO_EFECTIVO]') ?? false;

  useEffect(() => {
    if (!receipt.ClientId) return;
    clientService.getInvoices(receipt.ClientId, new Date().getFullYear())
      .then(grid => setClientInvoices(grid.Invoices.filter(i => i.Status === 'Pendiente' || i.Status === 'Vencida')))
      .catch(() => {});
  }, [receipt.ClientId]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const handleReject = async () => {
    if (reason.trim().length < 5) return;
    setLoading(true); setLocalError('');
    try {
      await paymentService.rejectReceipt(receipt.Id, reason);
      onProcessed();
    } catch {
      setLocalError('Error al rechazar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClient = async () => {
    setSearchErr(''); setFoundClient(null);
    try {
      const c = await clientService.getByPhone(assignPhone.trim());
      if (!c) { setSearchErr('No se encontró ningún cliente con ese número.'); return; }
      setFoundClient({ Id: c.Id, FullName: c.FullName, TbnCode: c.TbnCode });
    } catch {
      setSearchErr('Error buscando cliente. Intenta nuevamente.');
    }
  };

  const handleAssignClient = async () => {
    if (!foundClient) return;
    setLoading(true); setLocalError('');
    try {
      await paymentService.assignClient(receipt.Id, foundClient.Id);
      onProcessed();
    } catch {
      setLocalError('Error al asignar cliente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async () => {
    setLoading(true); setLocalError('');
    try {
      await paymentService.markNotRelated(receipt.Id);
      onProcessed();
    } catch {
      setLocalError('Error al procesar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {lightbox && (
      <div
        ref={lightboxRef}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
        onClick={e => { if (e.target === lightboxRef.current) setLightbox(false); }}
      >
        <button
          onClick={() => setLightbox(false)}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={receipt.ImageUrl}
          alt="Comprobante"
          className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain select-none"
        />
      </div>
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-queue-modal-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 id="whatsapp-queue-modal-title" className="font-semibold text-gray-900">Comprobante de {receipt.ClientName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Imagen */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Imagen recibida</p>

            {/* Fallback cuando la imagen no carga — evita bucle infinito de onError */}
            {imgError ? (
              <div className="rounded-xl border border-gray-200 w-full max-h-80 h-48 flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-2">
                <ImageOff className="w-8 h-8" />
                <span className="text-xs">Imagen no disponible</span>
                <a href={receipt.ImageUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-500 underline">
                  Abrir enlace directo
                </a>
              </div>
            ) : (
              <div className="relative group cursor-zoom-in" onClick={() => setLightbox(true)}>
                <img
                  src={receipt.ImageUrl}
                  alt="Comprobante WhatsApp"
                  className="rounded-xl border border-gray-200 w-full object-contain max-h-80"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 rounded-xl transition-colors">
                  <ZoomIn className="w-9 h-9 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-500">
                Cliente: <strong>{receipt.ClientName}</strong> ({receipt.TbnCode})
              </p>
              <p className="text-gray-500">Teléfono: {receipt.ClientPhone}</p>
              <p className="text-gray-500">
                Recibido: {new Date(receipt.ReceivedAt).toLocaleString('es-BO')}
              </p>
              {receipt.DeclaredAmount && (
                <p className="text-green-700 font-medium">
                  Monto declarado: Bs. {receipt.DeclaredAmount}
                </p>
              )}
              {receipt.MessageText && (
                <p className="text-gray-500 italic text-xs">"{receipt.MessageText}"</p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-4">
            {/* Aviso especial para recibos físicos en efectivo */}
            {isCashReceipt && action === null && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">🧾 Recibo de pago en efectivo</p>
                <p>El cliente envió la foto de un recibo físico. <strong>Verifica primero</strong> si este pago ya fue registrado por el cobrador antes de aprobar.</p>
              </div>
            )}

            {action === null && (
              <>
                <p className="text-sm font-medium text-gray-700">¿Qué hacer con este comprobante?</p>
                <button onClick={() => setAction('approve')}
                  disabled={!receipt.ClientId}
                  title={!receipt.ClientId ? 'No se puede aprobar: cliente no identificado' : undefined}
                  className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check className="w-4 h-4" /> Aprobar — registrar pago
                </button>
                {!receipt.ClientId && (
                  <>
                    <p className="text-xs text-amber-600">
                      ⚠ Cliente no identificado — asígnalo manualmente para poder aprobar.
                    </p>
                    <button onClick={() => setAction('assign')}
                      className="w-full text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors">
                      <UserPlus className="w-4 h-4" /> Asignar a cliente
                    </button>
                  </>
                )}
                <button onClick={() => setAction('reject')}
                  className="w-full text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors">
                  <X className="w-4 h-4" /> Rechazar — notificar al cliente
                </button>
                <button onClick={() => setAction('discard')}
                  className="w-full text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                  <XCircle className="w-4 h-4" /> No corresponde — descartar
                </button>
              </>
            )}

            {action === 'approve' && receipt.ClientId && (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Selecciona las facturas que cubre este pago para registrarlo:
                </p>
                <PaymentModal
                  clientId={receipt.ClientId}
                  invoices={clientInvoices}
                  receiptId={receipt.Id}
                  declaredAmount={receipt.DeclaredAmount ?? undefined}
                  onSuccess={onProcessed}
                  onClose={() => setAction(null)}
                />
              </div>
            )}

            {action === 'reject' && (
              <div className="space-y-3">
                <p className="text-sm text-amber-700 font-medium">¿Por qué se rechaza?</p>
                <textarea rows={3}
                  className="input-field resize-none"
                  placeholder="Ej: El comprobante no corresponde a nuestra entidad bancaria..."
                  value={reason}
                  onChange={e => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={handleReject}
                    disabled={reason.trim().length < 5 || loading}
                    className="btn-danger flex-1 text-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Rechazar y notificar
                  </button>
                  <button onClick={() => setAction(null)} className="btn-secondary flex-1 text-sm">
                    Volver
                  </button>
                </div>
              </div>
            )}

            {action === 'assign' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Buscar cliente por teléfono</p>
                <div className="flex gap-2">
                  <input
                    type="text" inputMode="numeric" maxLength={15}
                    className="input-field flex-1 text-sm"
                    placeholder="Ej: 70000000"
                    value={assignPhone}
                    onChange={e => { setAssignPhone(e.target.value.replace(/\D/g, '')); setFoundClient(null); setSearchErr(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearchClient(); }}
                  />
                  <button onClick={handleSearchClient} className="btn-secondary text-sm px-3">
                    Buscar
                  </button>
                </div>
                {searchErr && <p className="text-xs text-red-600">{searchErr}</p>}
                {foundClient && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
                    <p className="font-medium text-green-800">{foundClient.TbnCode} — {foundClient.FullName}</p>
                    <p className="text-xs text-green-600 mt-0.5">¿Asignar este cliente al comprobante?</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleAssignClient}
                    disabled={!foundClient || loading}
                    className="btn-primary flex-1 text-sm disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirmar asignación
                  </button>
                  <button onClick={() => { setAction(null); setAssignPhone(''); setFoundClient(null); setSearchErr(''); }}
                    className="btn-secondary flex-1 text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {action === 'discard' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  ¿Confirmas que esta imagen no es un comprobante de pago?
                </p>
                <div className="flex gap-2">
                  <button onClick={handleDiscard} disabled={loading}
                    className="btn-secondary flex-1 text-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Sí, descartar
                  </button>
                  <button onClick={() => setAction(null)} className="btn-secondary flex-1 text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {localError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                <span>⚠</span> {localError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
