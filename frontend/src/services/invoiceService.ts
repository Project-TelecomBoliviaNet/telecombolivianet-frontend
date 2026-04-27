import api from './api';
import type {
  InvoiceMonthStatsDto,
  InvoiceDetailDto,
  BillingJobResultDto,
  AnnualReportRowDto,
} from '@/types/invoice.types';
import type { PagedResult, ApiResponse } from '@/types/auth.types';

export interface InvoiceFilter {
  year?:      number;   // opcional — si no se envía, busca todos los meses
  month?:     number;   // opcional — si no se envía, busca todos los meses
  status?:    string;
  search?:    string;
  pageNumber?: number;
  pageSize?:   number;
}

export const invoiceService = {
  // US-23 · Estadísticas del mes
  getStats: async (year: number, month: number): Promise<InvoiceMonthStatsDto> => {
    const res = await api.get<ApiResponse<InvoiceMonthStatsDto>>(
      '/invoices/stats', { params: { year, month } });
    return res.data.data!;
  },

  // US-23 · Listado paginado con filtros
  getAll: async (filter: InvoiceFilter): Promise<PagedResult<InvoiceDetailDto>> => {
    const res = await api.get<ApiResponse<PagedResult<InvoiceDetailDto>>>(
      '/invoices', { params: filter });
    return res.data.data!;
  },

  // US-26 · Ejecutar job manual
  generateManual: async (year: number, month: number): Promise<BillingJobResultDto> => {
    const res = await api.post<ApiResponse<BillingJobResultDto>>(
      '/invoices/generate', null, { params: { year, month } });
    return res.data.data!;
  },

  // US-26 · Forzar vencimiento
  markOverdue: async (): Promise<number> => {
    const res = await api.post<ApiResponse<{ MarkedOverdue: number }>>('/invoices/mark-overdue');
    return res.data.data!.MarkedOverdue;
  },

  // US-25 · Anular factura
  voidInvoice: async (id: string, justification: string): Promise<void> => {
    await api.put(`/invoices/${id}/void`, { Justification: justification });
  },

  // US-27 · Reporte anual
  getAnnualReport: async (params: {
    year: number; zone?: string; planId?: string;
    debtFilter?: string; sortBy?: string;
  }): Promise<AnnualReportRowDto[]> => {
    const res = await api.get<ApiResponse<AnnualReportRowDto[]>>(
      '/invoices/annual-report', { params });
    return res.data.data!;
  },

  // US-24 · Descargar Excel (backend genera el archivo profesional)
  exportExcel: async (year: number, month: number): Promise<void> => {
    const res = await api.get('/invoices/export/excel', {
      params: { year, month },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `Facturas_${year}_${String(month).padStart(2,'0')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // US-24 · Descargar PDF (backend genera el archivo profesional)
  exportPdf: async (year: number, month: number): Promise<void> => {
    const res = await api.get('/invoices/export/pdf', {
      params: { year, month },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `Facturas_${year}_${String(month).padStart(2,'0')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

};


// ── M3: Tipos nuevos ──────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'Pendiente' | 'Pagada' | 'Vencida' | 'Anulada'
  | 'Emitida' | 'Enviada' | 'ParcialmentePagada'; // US-FAC-ESTADOS

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  Emitida:            'Emitida',
  Enviada:            'Enviada',
  Pendiente:          'Pendiente',
  Vencida:            'Vencida',
  ParcialmentePagada: 'Pago Parcial',
  Pagada:             'Pagada',
  Anulada:            'Anulada',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  Emitida:            'bg-blue-50 text-blue-700 border-blue-200',
  Enviada:            'bg-indigo-50 text-indigo-700 border-indigo-200',
  Pendiente:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  Vencida:            'bg-red-50 text-red-700 border-red-200',
  ParcialmentePagada: 'bg-orange-50 text-orange-700 border-orange-200',
  Pagada:             'bg-green-50 text-green-700 border-green-200',
  Anulada:            'bg-gray-100 text-gray-500 border-gray-200',
};

// Transiciones permitidas por estado (mirrors backend)
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  Emitida:            ['Enviada', 'Pendiente', 'Anulada'],
  Enviada:            ['Pendiente', 'Anulada'],
  Pendiente:          ['Vencida', 'Anulada'],
  Vencida:            ['Anulada'],
  ParcialmentePagada: ['Pagada', 'Anulada'],
  Pagada:             [],
  Anulada:            [],
};

export const MOTIVOS_EXTRAORDINARIOS = [
  'Reconexion', 'Equipo', 'VisitaTecnica', 'Instalacion', 'Otro',
] as const;
export type MotivoExtraordinario = typeof MOTIVOS_EXTRAORDINARIOS[number];

export const MOTIVO_LABELS: Record<MotivoExtraordinario, string> = {
  Reconexion:    'Reconexión',
  Equipo:        'Equipo / Hardware',
  VisitaTecnica: 'Visita Técnica',
  Instalacion:   'Instalación',
  Otro:          'Otro',
};

export interface InvoiceM3ListItem {
  Id: string;
  InvoiceNumber: string;
  ClientId: string;
  TbnCode: string;
  ClientName: string;
  Type: string;
  Status: InvoiceStatus;
  Year: number;
  Month: number;
  Amount: number;
  AmountPaid: number;
  CreditApplied: number;
  IssuedAt: string;
  DueDate: string;
  UpdatedAt: string | null;
  Notes: string | null;
  IsExtraordinary: boolean;
  ExtraordinaryReason: string | null;
}

// ── M3: Funciones nuevas ──────────────────────────────────────────────────────

// US-FAC-02: Crear factura extraordinaria
export const createExtraordinaryInvoice = async (dto: {
  ClientId: string;
  Amount: number;
  Motivo: string;
  DueDate: string;
  Notes?: string;
}): Promise<InvoiceM3ListItem> => {
  const res = await api.post('/invoices/extraordinary', dto);
  return res.data.data;
};

// US-FAC-ESTADOS: Transicionar estado de factura
export const transicionarEstado = async (
  id: string, nuevoEstado: InvoiceStatus
): Promise<void> => {
  await api.patch(`/invoices/${id}/estado`, { NuevoEstado: nuevoEstado });
};

// US-FAC-ESTADOS: Marcar masivamente Emitidas → Enviadas
export const marcarFacturasEnviadas = async (
  year: number, month: number
): Promise<{ Count: number; Period: string }> => {
  const res = await api.post('/invoices/marcar-enviadas', { Year: year, Month: month });
  return res.data.data;
};

// US-FAC-CREDITO: Aplicar crédito del cliente a factura
export const aplicarCreditoAFactura = async (invoiceId: string): Promise<void> => {
  await api.post(`/invoices/${invoiceId}/aplicar-credito`);
};