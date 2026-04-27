/**
 * PaymentModal — Registrar pago para un cliente.
 *
 * Props:
 *  clientId    — ID del cliente
 *  invoices    — Lista de facturas disponibles
 *  preselected — ID de factura preseleccionada (opcional)
 *  onSuccess   — Callback al registrar con éxito
 *  onClose     — Callback al cerrar/cancelar
 */

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerPaymentWithCredit } from '@/services/paymentService';
import type { InvoiceDto } from '@/types/client.types';
import { extractApiError } from '@/utils/apiError';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['Efectivo', 'DepositoBancario', 'QR', 'Transferencia'] as const;
const BANKS = ['BNB', 'BCP', 'Unión', 'BISA', 'FIE', 'Prodem', 'Otro'];

const fmtBs = (v: number) =>
  `Bs ${v.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────

interface PaymentModalProps {
  clientId:    string;
  invoices:    InvoiceDto[];
  preselected?: string;
  onSuccess:   () => void;
  onClose:     () => void;
}

export function PaymentModal({
  clientId, invoices, preselected, onSuccess, onClose,
}: PaymentModalProps) {
  const pendingInvoices = invoices.filter(
    (inv) => inv.Status === 'Pendiente' || inv.Status === 'Vencida'
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(
    preselected ? [preselected] : []
  );
  const [method,   setMethod]   = useState<string>('Efectivo');
  const [bank,     setBank]     = useState<string>('');
  const [paidAt,   setPaidAt]   = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [receipt,  setReceipt]  = useState<string>('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  // Auto-select preselected on mount
  useEffect(() => {
    if (preselected) setSelectedIds([preselected]);
  }, [preselected]);

  const total = pendingInvoices
    .filter((inv) => selectedIds.includes(inv.Id))
    .reduce((sum, inv) => sum + inv.Amount, 0);

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Selecciona al menos una factura.');
      return;
    }
    if (!paidAt) {
      setError('Ingresa la fecha de pago.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerPaymentWithCredit({
        ClientId:              clientId,
        Amount:                total,
        Method:                method,
        Bank:                  method === 'Efectivo' ? undefined : (bank || undefined),
        PaidAt:                new Date(paidAt).toISOString(),
        InvoiceIds:            selectedIds,
        PhysicalReceiptNumber: receipt || undefined,
      });
      setSuccess(true);
      setTimeout(onSuccess, 1000);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error al registrar el pago. Intente de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Registrar pago</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Pago registrado correctamente.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Facturas */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Facturas a cubrir
            </p>
            {pendingInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay facturas pendientes.</p>
            ) : (
              <div className="space-y-1.5">
                {pendingInvoices.map((inv) => (
                  <label
                    key={inv.Id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={selectedIds.includes(inv.Id)}
                      onChange={() => toggleInvoice(inv.Id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {inv.Type === 'Instalacion' ? 'Instalación' : monthLabel(inv.Year, inv.Month)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Vence {new Date(inv.DueDate).toLocaleDateString('es-BO')}
                        {' · '}
                        <span className={inv.Status === 'Vencida' ? 'text-red-600 font-medium' : ''}>
                          {inv.Status}
                        </span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {fmtBs(inv.Amount)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">Total a pagar</span>
              <span className="text-base font-bold text-blue-900">{fmtBs(total)}</span>
            </div>
          )}

          {/* Método */}
          <div>
            <label className="label">Método de pago</label>
            <select
              className="input-field"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Banco (solo para transferencia/depósito) */}
          {method !== 'Efectivo' && method !== 'QR' && (
            <div>
              <label className="label">Banco</label>
              <select
                className="input-field"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="label">Fecha de pago</label>
            <input
              type="date"
              className="input-field"
              value={paidAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          {/* Número de recibo físico */}
          <div>
            <label className="label">N° de recibo físico <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: 000123"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={loading || selectedIds.length === 0 || success}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando…</>
              : 'Registrar pago'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
