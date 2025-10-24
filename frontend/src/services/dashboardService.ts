import api from './api';
import type { ApiResponse } from '@/types/auth.types';

export interface DashboardKpisDto {
  ClientesActivos: number; ClientesSuspendidos: number; ClientesNuevosMes: number;
  CobradoEsteMes: number; CobradoMesAnterior: number;
  ClientesConDeuda: number; MontoDeudaTotal: number;
  TicketsAbiertos: number; TicketsCriticos: number;
  TicketsResueltosHoy: number; TicketsSlaVencidos: number;
  ComprobantesPendientes: number; MensajesWspHoy: number;
  Arpu: number;                 // F1: ingreso promedio por cliente activo
  ClientesCanceladosMes: number; // F2: bajas del mes
}
export interface TendenciaMes { Mes: string; MesCompleto: string; Total: number; Cantidad: number; }
export interface TendenciaCobrosDto { Meses: TendenciaMes[]; }
export interface MetodoPagoDto { Metodo: string; Cantidad: number; Monto: number; }
export interface TicketEstadoDashDto { Estado: string; Total: number; Criticos: number; }
export interface TicketDashItemDto {
  Id: string; ClienteNombre: string; Asunto: string;
  Tipo: string; Prioridad: string; Estado: string; Tecnico: string;
  CreadoEn: string; FechaLimite: string | null; SlaVencido: boolean;
}
export interface TicketPorTipoDto { Tipo: string; Total: number; }
export interface ResolucionPromDto { Prioridad: string; HorasPromedio: number; Cantidad: number; }
export interface WhatsAppActividadDto { Hora: string; ClienteNombre: string; Estado: string; Monto: number | null; }
export interface DeudorItem { ClienteId: string; ClienteNombre: string; Zona: string; MontoDeuda: number; DiasVencido: number; FacturasVencidas: number; }
export interface ComprobanteReciente { Id: string; ClienteNombre: string; Monto: number; FechaPago: string; Estado: string; Metodo: string; }
export interface ClientesPorZonaDto { Zona: string; Total: number; Activos: number; ConDeuda: number; }
export interface ActividadHoraDto { Hora: number; Pagos: number; Tickets: number; WhatsApp: number; }

// ── M4: US-DASH-PAGOS ────────────────────────────────────────────────────────
export interface DashPagosPorMetodoDto { Metodo: string; Cantidad: number; Monto: number; PctMonto: number; }
export interface DashPagosPorOperadorDto { OperadorNombre: string; Cantidad: number; Monto: number; }
export interface DashPagosDto {
  TotalHoy: number; TotalMes: number; CountHoy: number; CountMes: number;
  PorMetodo: DashPagosPorMetodoDto[]; PorOperador: DashPagosPorOperadorDto[];
  Tendencia6M: TendenciaMes[];
}

// ── M4: US-DASH-TICKETS-M ─────────────────────────────────────────────────────
export interface DashTicketPorTipoMetricaDto {
  Tipo: string; Total: number; Abiertos: number; Resueltos: number; PromedioHoras: number;
}
export interface DashTicketsMetricasDto {
  TotalAbiertos: number; TotalEnProceso: number; TotalResueltosMes: number;
  TotalVencidosSla: number; SlaCompliancePct: number; ResolucionPromedioHoras: number;
  PorTipo: DashTicketPorTipoMetricaDto[]; VencidosSla: TicketDashItemDto[];
}

// ── M4: US-DASH-NOTIF ─────────────────────────────────────────────────────────
export interface DashNotifPorTipoDto { NotifTipo: string; Enviadas: number; Fallidas: number; Pendientes: number; }
export interface DashNotifDto {
  EnviadasUlt24h: number; FallidasUlt24h: number; PendientesEnCola: number;
  OmitidosAntispam: number; TasaExitoUlt24h: number;
  PorTipo: DashNotifPorTipoDto[];
}

// ── M4: US-DASH-CHATBOT ──────────────────────────────────────────────────────
export interface DashChatbotIntencionDto { Intencion: string; Ocurrencias: number; PctTotal: number; }
export interface DashChatbotDto {
  ConversacionesActivas: number; ConversacionesHoy: number; ConversacionesMes: number;
  TasaResolucionBot: number; TasaEscaladoHumano: number;
  IntencionesFrecuentes: DashChatbotIntencionDto[];
  IsAvailable: boolean;
}

// ── M4: US-DASH-AUTO ─────────────────────────────────────────────────────────
export interface DashAutoActionItemDto { Accion: string; Detalle: string; OcurridoAt: string; AreaModulo: string; }
export interface DashAutoActionsDto {
  SuspensionesHoy: number; ReactivacionesHoy: number; FacturasEmitidasHoy: number;
  RecordatoriosEnviadosHoy: number; FacturasVencidasMarcadasHoy: number;
  Recientes: DashAutoActionItemDto[];
}

// ── F5: Aging de cartera ─────────────────────────────────────────────────
export interface AgingBucketDto { Rango: string; FacturasCount: number; MontoTotal: number; ClientesCount: number; }
export interface AgingCarteraDto { TotalCartera: number; TotalFacturas: number; Buckets: AgingBucketDto[]; }

// ── F6: Clientes próximos a corte ────────────────────────────────────────
export interface ClienteProximoCortDto { ClienteId: string; ClienteNombre: string; Zona: string; MontoDeuda: number; DiasParaCorte: number; EstadoFactura: string; }
export interface ProximosCortDto { Total: number; Clientes: ClienteProximoCortDto[]; }

// ── F7: Workload de técnicos ──────────────────────────────────────────────
export interface WorkloadTecnicoDto { TecnicoNombre: string; TicketsActivos: number; TicketsCriticos: number; TicketsEnVisita: number; PromedioHorasAbierto: number; }
export interface WorkloadTecnicosDto { TotalSinAsignar: number; Tecnicos: WorkloadTecnicoDto[]; }

export interface DashboardPreferences {
  ShowKpis: boolean; ShowTendencia: boolean; ShowTickets: boolean; ShowWhatsApp: boolean;
  ShowDeudores: boolean; ShowZonas: boolean; ShowMetodosPago: boolean; ShowComprobantes: boolean;
}

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  ShowKpis: true, ShowTendencia: true, ShowTickets: true, ShowWhatsApp: true,
  ShowDeudores: true, ShowZonas: true, ShowMetodosPago: true, ShowComprobantes: true,
};

const g = <T>(url: string, params?: object) =>
  api.get<ApiResponse<T>>(url, params ? { params } : undefined).then(r => r.data.data!);

export const dashboardService = {
  getKpis:                 ()          => g<DashboardKpisDto>('/dashboard/kpis'),
  getTendenciaCobros:      (meses = 6) => g<TendenciaCobrosDto>('/dashboard/tendencia-cobros', { meses }),
  getMetodosPago:          ()          => g<MetodoPagoDto[]>('/dashboard/metodos-pago'),
  getTicketsEstado:        ()          => g<TicketEstadoDashDto[]>('/dashboard/tickets-estado'),
  getTicketsUrgentes:      ()          => g<TicketDashItemDto[]>('/dashboard/tickets-urgentes'),
  getTicketsPorTipo:       ()          => g<TicketPorTipoDto[]>('/dashboard/tickets-por-tipo'),
  getResolucionPromedio:   ()          => g<ResolucionPromDto[]>('/dashboard/resolucion-promedio'),
  getWhatsAppActividad:    ()          => g<WhatsAppActividadDto[]>('/dashboard/whatsapp-actividad'),
  getDeudores:             ()          => g<DeudorItem[]>('/dashboard/deudores'),
  getComprobantesRecientes:()          => g<ComprobanteReciente[]>('/dashboard/comprobantes-recientes'),
  getClientesPorZona:      ()          => g<ClientesPorZonaDto[]>('/dashboard/clientes-por-zona'),
  getActividadHoras:       ()          => g<ActividadHoraDto[]>('/dashboard/actividad-horas'),
  getPreferences: async (userId: string): Promise<DashboardPreferences> => {
    try { return await g<DashboardPreferences>(`/dashboard/preferences/${userId}`); }
    catch { return DEFAULT_PREFERENCES; }
  },
  savePreferences: (userId: string, prefs: DashboardPreferences) =>
    api.put(`/dashboard/preferences/${userId}`, prefs),
  // M4
  getDashPagos:          () => g<DashPagosDto>('/dashboard/pagos'),
  getDashTicketsMetricas:() => g<DashTicketsMetricasDto>('/dashboard/tickets-metricas'),
  getDashNotifStats:     () => g<DashNotifDto>('/dashboard/notif-stats'),
  getDashChatbotKpis:    () => g<DashChatbotDto>('/dashboard/chatbot-kpis'),
  getDashAutoActions:    () => g<DashAutoActionsDto>('/dashboard/auto-actions'),
  // F5, F6, F7
  getAgingCartera:       ()           => g<AgingCarteraDto>('/dashboard/aging-cartera'),
  getProximosCorte:      (dias = 7)   => g<ProximosCortDto>('/dashboard/proximos-corte', { dias }),
  getWorkloadTecnicos:   ()           => g<WorkloadTecnicosDto>('/dashboard/workload-tecnicos'),
};
