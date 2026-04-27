import { useState, useEffect } from 'react';
import { Loader2, X, XCircle, Check } from 'lucide-react';
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
  const [action,         setAction]         = useState<'approve' | 'reject' | 'discard' | null>(null);
  const [reason,         setReason]         = useState('');
  const [loading,        setLoading]        = useState(false);
  const [localError,     setLocalError]     = useState('');
  const [clientInvoices, setClientInvoices] = useState<InvoiceDto[]>([]);

  useEffect(() => {
    clientService.getInvoices(receipt.ClientId, new Date().getFullYear())
      .then(grid => setClientInvoices(grid.Invoices.filter(i => i.Status === 'Pendiente' || i.Status === 'Vencida')))
      .catch(() => {});
  }, [receipt.ClientId]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Comprobante de {receipt.ClientName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Imagen */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Imagen recibida</p>
            <img src={receipt.ImageUrl} alt="Comprobante WhatsApp"
              className="rounded-xl border border-gray-200 w-full object-contain max-h-80"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-receipt.png'; }} />
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
            {action === null && (
              <>
                <p className="text-sm font-medium text-gray-700">¿Qué hacer con este comprobante?</p>
                <button onClick={() => setAction('approve')}
                  className="btn-primary w-full text-sm">
                  <Check className="w-4 h-4" /> Aprobar — registrar pago
                </button>
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

            {action === 'approve' && (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Selecciona las facturas que cubre este pago para registrarlo:
                </p>
                <PaymentModal
                  clientId={receipt.ClientId}
                  invoices={clientInvoices}
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
  );
}
