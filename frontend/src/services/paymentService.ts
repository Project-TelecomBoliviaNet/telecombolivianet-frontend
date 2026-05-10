import api from './api';
import type {
  PaymentListItemDto, PaymentDetailDto, PaymentFilterDto,
  DuplicateCheckResultDto, WhatsAppReceiptDto,
  CollectionReportDto, ReminderJobResultDto,
} from '@/types/payment.types';
import type { PagedResult, ApiResponse } from '@/types/auth.types';

export const paymentService = {
  // US-28 · Listado centralizado
  getAll: async (filter: PaymentFilterDto = {}): Promise<PagedResult<PaymentListItemDto>> => {
    const res = await api.get<ApiResponse<PagedResult<PaymentListItemDto>>>(
      '/payments', { params: filter });
    return res.data.data!;
  },

  // US-28 · Detalle de un pago
  getById: async (id: string): Promise<PaymentDetailDto> => {
    const res = await api.get<ApiResponse<PaymentDetailDto>>(`/payments/${id}`);
    return res.data.data!;
  },

  // US-29 · Subir imagen del comprobante
  uploadReceiptImage: async (paymentId: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<ApiResponse<{ Url: string }>>(
      `/payments/${paymentId}/receipt-image`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data!.Url;
  },

  // US-31 · Anular pago
  voidPayment: async (id: string, justification: string) => {
    const res = await api.put<ApiResponse<{ InvoicesReverted: number; Message: string }>>(
      `/payments/${id}/void`, { Justification: justification });
    return res.data.data!;
  },

  // US-32 · Reporte de cobranza
  getCollectionReport: async (from: string, to: string): Promise<CollectionReportDto> => {
    const res = await api.get<ApiResponse<CollectionReportDto>>(
      '/payments/collection-report', { params: { from, to } });
    return res.data.data!;
  },

  // US-35 · Verificar duplicados
  checkDuplicate: async (
    clientId: string, amount: number, paidAt: string
  ): Promise<DuplicateCheckResultDto> => {
    const res = await api.get<ApiResponse<DuplicateCheckResultDto>>(
      '/payments/check-duplicate', { params: { clientId, amount, paidAt } });
    return res.data.data!;
  },

  // US-34 · Job de recordatorios manual
  sendReminders: async (): Promise<ReminderJobResultDto> => {
    const res = await api.post<ApiResponse<ReminderJobResultDto>>('/payments/send-reminders');
    return res.data.data!;
  },

  // US-30 · Cola de comprobantes WhatsApp
  getWhatsAppQueue: async (
    page = 1, pageSize = 25, status = 'Pendiente'
  ): Promise<PagedResult<WhatsAppReceiptDto>> => {
    const res = await api.get<ApiResponse<PagedResult<WhatsAppReceiptDto>>>(
      '/payments/whatsapp-queue', { params: { page, pageSize, status } });
    return res.data.data!;
  },

  getPendingCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<{ Count: number }>>('/payments/whatsapp-queue/count');
    return res.data.data!.Count;
  },

  approveReceipt: async (id: string, data: {
    Amount: number; Method: string; Bank?: string;
    PaidAt: string; PhysicalReceiptNumber?: string;
    BankReference?: string; InvoiceIds: string[];
  }) => {
    const res = await api.post<ApiResponse<{ PaymentId: string }>>(
      `/payments/whatsapp-queue/${id}/approve`, data);
    return res.data.data!;
  },

  rejectReceipt: async (id: string, reason: string): Promise<void> => {
    await api.post(`/payments/whatsapp-queue/${id}/reject`, { Reason: reason });
  },

  markNotRelated: async (id: string): Promise<void> => {
    await api.post(`/payments/whatsapp-queue/${id}/not-related`);
  },

  assignClient: async (id: string, clientId: string): Promise<void> => {
    await api.post(`/payments/whatsapp-queue/${id}/assign-client`, { ClientId: clientId });
  },
};

// ── M2: tipos nuevos ──────────────────────────────────────────────────────────

export interface CashCloseChannelDetail {
  Method: string;
  Cantidad: number;
  Monto: number;
}

export interface CashCloseDto {
  Id: string;
  UserId: string;
  OperatorName: string;
  StartedAt: string;
  ClosedAt: string | null;
  TotalAmount: number;
  PagosValidados: number;
  PagosRechazados: number;
  Detalle: CashCloseChannelDetail[];
  IsClosed: boolean;
  PdfPath: string | null;
}

export interface PaymentRegisteredDto {
  PaymentId: string;
  ReceiptNumber: string;
  AmountPaid: number;
  CreditGenerated: number;
  CreditUsed: number;
  Message: string;
}

export interface CollectionReportByOperatorDto {
  From: string;
  To: string;
  TotalAmount: number;
  Count: number;
  OperatorName: string | null;
  Payments: PaymentReportRow[];
  Operators: { Id: string; Name: string }[];
}

export interface PaymentReportRow {
  Id: string;
  TbnCode: string;
  ClientName: string;
  Amount: number;
  Method: string;
  Bank: string | null;
  PaidAt: string;
  OperatorName: string;
  PhysicalReceiptNumber: string | null;
  FromWhatsApp: boolean;
}

// ── M2: funciones ─────────────────────────────────────────────────────────────

// US-PAG-CREDITO: registro de pago con crédito
export const registerPaymentWithCredit = async (dto: {
  ClientId: string;
  Amount: number;
  Method: string;
  Bank?: string;
  PaidAt: string;
  InvoiceIds: string[];
  PhysicalReceiptNumber?: string;
  BankReference?: string;
}): Promise<PaymentRegisteredDto> => {
  const res = await api.post('/payments/register-with-credit', dto);
  return res.data.data;
};

// US-PAG-CREDITO: reembolso manual (admin)
export const reembolsarCredito = async (
  clientId: string, justificacion: string
): Promise<void> => {
  await api.post(`/clients/${clientId}/credit/reembolsar`, { Justificacion: justificacion });
};

// US-PAG-CAJA: obtener turno activo
export const getActiveTurno = async (): Promise<CashCloseDto> => {
  const res = await api.get('/payments/cash-close/active');
  return res.data.data;
};

// US-PAG-CAJA: cerrar turno
export const cerrarTurno = async (): Promise<CashCloseDto> => {
  const res = await api.post('/payments/cash-close/close');
  return res.data.data;
};

// US-PAG-CAJA: historial de cierres
export const getCashCloses = async (
  operatorId?: string, desde?: string, hasta?: string
): Promise<CashCloseDto[]> => {
  const params: Record<string, string> = {};
  if (operatorId) params.operatorId = operatorId;
  if (desde)      params.desde      = desde;
  if (hasta)      params.hasta      = hasta;
  const res = await api.get('/payments/cash-close', { params });
  return res.data.data;
};

// US-PAG-RECIBO: descargar recibo PDF
export const downloadReceipt = async (paymentId: string): Promise<void> => {
  const res = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = `recibo-${paymentId}.pdf`; a.click();
  URL.revokeObjectURL(url);
};

// US-PAG-06: reporte por operador
export const getCollectionByOperator = async (
  from: string, to: string, operatorId?: string
): Promise<CollectionReportByOperatorDto> => {
  const params: Record<string, string> = { from, to };
  if (operatorId) params.operatorId = operatorId;
  const res = await api.get('/payments/report/by-operator', { params });
  return res.data.data;
};

// US-PAG-06: exportar CSV con operador
export const exportPaymentsCSV = async (
  from: string, to: string, operatorId?: string
): Promise<void> => {
  const params: Record<string, string> = { from, to };
  if (operatorId) params.operatorId = operatorId;
  const res = await api.get('/payments/report/export-csv', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = `cobros-${from}-${to}.csv`; a.click();
  URL.revokeObjectURL(url);
};
