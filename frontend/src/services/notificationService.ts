import api from './api';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'SUSPENSION'
  | 'REACTIVACION'
  | 'RECORDATORIO_R1'
  | 'RECORDATORIO_R2'
  | 'RECORDATORIO_R3'
  | 'FACTURA_VENCIDA'
  | 'CONFIRMACION_PAGO'
  | 'TICKET_ASIGNADO'
  // US-NOT-04: nuevos triggers
  | 'TICKET_CREADO'
  | 'TICKET_RESUELTO'
  | 'CAMBIO_PLAN';

export const NOTIF_TYPE_LABELS: Record<NotifType, string> = {
  SUSPENSION:        'Suspensión',
  REACTIVACION:      'Reactivación',
  RECORDATORIO_R1:   'Recordatorio R1',
  RECORDATORIO_R2:   'Recordatorio R2',
  RECORDATORIO_R3:   'Recordatorio R3',
  FACTURA_VENCIDA:   'Factura Vencida',
  CONFIRMACION_PAGO: 'Confirmación de Pago',
  TICKET_ASIGNADO:   'Ticket Asignado (Técnico)',
  TICKET_CREADO:     'Ticket Creado',
  TICKET_RESUELTO:   'Ticket Resuelto',
  CAMBIO_PLAN:       'Cambio de Plan',
};

// US-NOT-03
export type PlantillaCategoria = 'Cobro' | 'Bienvenida' | 'Tecnico' | 'Ticket' | 'General';
export type HsmStatus = 'Aprobada' | 'Pendiente' | 'Rechazada';

export const HSM_STATUS_COLORS: Record<HsmStatus, string> = {
  Aprobada:  'text-green-600 bg-green-50 border-green-200',
  Pendiente: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  Rechazada: 'text-red-600 bg-red-50 border-red-200',
};

export const CATEGORIA_LABELS: Record<PlantillaCategoria, string> = {
  Cobro:      'Cobro',
  Bienvenida: 'Bienvenida',
  Tecnico:    'Técnico',
  Ticket:     'Ticket',
  General:    'General',
};

// US-NOT-VARS: todas las variables disponibles
export const ALL_VARIABLES: { variable: string; descripcion: string }[] = [
  { variable: '{{nombre}}',            descripcion: 'Primer nombre del cliente' },
  { variable: '{{apellido}}',          descripcion: 'Apellido del cliente' },
  { variable: '{{nombre_completo}}',   descripcion: 'Nombre completo del cliente' },
  { variable: '{{deuda}}',             descripcion: 'Deuda total pendiente en Bs.' },
  { variable: '{{monto}}',             descripcion: 'Monto de la factura o pago' },
  { variable: '{{periodo}}',           descripcion: 'Período de la factura (ej: Enero 2026)' },
  { variable: '{{fecha_vencimiento}}', descripcion: 'Fecha de vencimiento de la factura' },
  { variable: '{{plan}}',              descripcion: 'Nombre del plan del cliente' },
  { variable: '{{zona}}',              descripcion: 'Zona del cliente' },
  { variable: '{{empresa}}',           descripcion: 'Nombre del ISP (SystemConfig)' },
  { variable: '{{dias_mora}}',         descripcion: 'Días de mora' },
  { variable: '{{meses_mora}}',        descripcion: 'Meses de mora' },
  { variable: '{{meses_pendientes}}',  descripcion: 'Meses con facturas pendientes' },
  { variable: '{{fecha_corte}}',       descripcion: 'Fecha de corte configurada' },
  { variable: '{{num_ticket}}',        descripcion: 'Número correlativo del ticket' },
  { variable: '{{tecnico}}',           descripcion: 'Nombre del técnico asignado' },
  { variable: '{{fecha_visita}}',      descripcion: 'Fecha programada de visita técnica' },
];

export interface NotifConfigDto {
  Tipo: NotifType;
  Activo: boolean;
  DelaySegundos: number;
  HoraInicio: string;
  HoraFin: string;
  Inmediato: boolean;
  DiasAntes: number | null;
  PlantillaId: string | null; // US-NOT-04
}

export interface NotifConfigListDto {
  Configs: NotifConfigDto[];
  HoraServidorLocal: string;
}

export interface NotifPlantillaDto {
  Id: string;
  Tipo: NotifType;
  Texto: string;
  Activa: boolean;
  Categoria: PlantillaCategoria; // US-NOT-03
  HsmStatus: HsmStatus;          // US-NOT-03
  CreadoAt: string;
}

export interface NotifLogItemDto {
  Id: string;
  OutboxId: string;
  Tipo: NotifType;
  TipoLabel: string;
  Estado: string;
  PhoneNumber: string;
  Mensaje: string;
  IntentoNum: number;
  ErrorDetalle: string | null;
  RegistradoAt: string;
  EnviarDesde: string | null;
}

export interface NotifLogPageDto {
  Items: NotifLogItemDto[];
  Total: number;
  Page: number;
  PageSize: number;
}

// US-NOT-02: Segmentos
export type SegmentOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';
export type SegmentCampo = 'deuda' | 'dias_mora' | 'zona' | 'plan' | 'estado';

export interface SegmentCondition {
  Campo: SegmentCampo;
  Operador: SegmentOperator;
  Valor: string;
}

export interface SegmentConditionGroup {
  Condiciones: SegmentCondition[];
}

export interface NotifSegmentDto {
  Id: string;
  Nombre: string;
  Descripcion: string | null;
  Reglas: SegmentConditionGroup[];
  CreadoAt: string;
  ClientesEstimados: number | null;
}

// US-NOT-PREVIEW
export interface PlantillaPreviewDto {
  TextoRenderizado: string;
  VariablesNoEncontradas: string[];
}

// ── Config (US-35/38/NOT-04) ──────────────────────────────────────────────────

export const getNotifConfigs = async (): Promise<NotifConfigListDto> => {
  const { data } = await api.get('/config/notifications');
  return data.data;
};

export const updateNotifConfigs = async (
  configs: NotifConfigDto[],
  confirmSuspension = false,
): Promise<void> => {
  const headers: Record<string, string> = {};
  if (confirmSuspension) headers['X-Confirm-Suspension'] = 'true';
  await api.put('/config/notifications', { Configs: configs }, { headers });
};

// ── Plantillas (US-37/NOT-03) ─────────────────────────────────────────────────

export const getPlantillas = async (
  categoria?: PlantillaCategoria,
  hsmStatus?: HsmStatus,
): Promise<NotifPlantillaDto[]> => {
  const params: Record<string, string> = {};
  if (categoria)  params.categoria  = categoria;
  if (hsmStatus)  params.hsmStatus  = hsmStatus;
  const { data } = await api.get('/config/notifications/templates', { params });
  return data.data;
};

export const updatePlantilla = async (
  tipo: NotifType,
  texto: string,
  categoria: PlantillaCategoria = 'General',
  hsmStatus: HsmStatus = 'Aprobada',
): Promise<void> => {
  await api.put(`/config/notifications/templates/${tipo}`, { Texto: texto, Categoria: categoria, HsmStatus: hsmStatus });
};

export const updateHsmStatus = async (tipo: NotifType, hsmStatus: HsmStatus): Promise<void> => {
  await api.patch(`/config/notifications/templates/${tipo}/hsm`, { HsmStatus: hsmStatus });
};

export const restorePlantilla = async (tipo: NotifType): Promise<void> => {
  await api.post(`/config/notifications/templates/${tipo}/restore`);
};

// ── Variables disponibles (US-NOT-VARS) ───────────────────────────────────────

export const getVariablesDisponibles = async (): Promise<{ Variable: string; Descripcion: string }[]> => {
  const { data } = await api.get('/config/notifications/variables');
  return data.data;
};

// ── Preview de plantilla (US-NOT-PREVIEW) ────────────────────────────────────

export const previewPlantilla = async (
  texto: string,
  clienteId?: string,
): Promise<PlantillaPreviewDto> => {
  const { data } = await api.post('/config/notifications/templates/preview', {
    Texto: texto,
    ClienteId: clienteId ?? null,
  });
  return data.data;
};

// ── Segmentos (US-NOT-02) ─────────────────────────────────────────────────────

export const getSegments = async (): Promise<NotifSegmentDto[]> => {
  const { data } = await api.get('/config/notifications/segments');
  return data.data;
};

export const getSegmentById = async (id: string): Promise<NotifSegmentDto> => {
  const { data } = await api.get(`/config/notifications/segments/${id}`);
  return data.data;
};

export const createSegment = async (
  dto: { Nombre: string; Descripcion: string | null; Reglas: SegmentConditionGroup[] },
): Promise<NotifSegmentDto> => {
  const { data } = await api.post('/config/notifications/segments', dto);
  return data.data;
};

export const updateSegment = async (
  id: string,
  dto: { Nombre: string; Descripcion: string | null; Reglas: SegmentConditionGroup[] },
): Promise<NotifSegmentDto> => {
  const { data } = await api.put(`/config/notifications/segments/${id}`, dto);
  return data.data;
};

export const deleteSegment = async (id: string): Promise<void> => {
  await api.delete(`/config/notifications/segments/${id}`);
};

export const previewSegment = async (
  dto: { Nombre: string; Descripcion: string | null; Reglas: SegmentConditionGroup[] },
): Promise<{ ClientesCoinciden: number }> => {
  const { data } = await api.post('/config/notifications/segments/preview', dto);
  return data.data;
};

// ── Envío masivo anti-spam (US-NOT-ANTISPAM) ──────────────────────────────────

export const envioMasivo = async (
  tipo: NotifType,
  segmentId?: string,
): Promise<{ Enviados: number; OmitidosAntispam: number; SinTelefono: number }> => {
  const { data } = await api.post('/config/notifications/send-masivo', {
    Tipo: tipo,
    SegmentId: segmentId ?? null,
  });
  return data.data;
};

// ── Historial por cliente (US-36) ─────────────────────────────────────────────

export const getClientNotifications = async (
  clientId: string,
  page = 1,
  pageSize = 20,
  tipo?: string,
  desde?: string,
  hasta?: string,
): Promise<NotifLogPageDto> => {
  const params: Record<string, unknown> = { page, pageSize };
  if (tipo)  params.tipo  = tipo;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const { data } = await api.get(`/clients/${clientId}/notifications`, { params });
  return data.data;
};

// ── Cancelación (US-39) ───────────────────────────────────────────────────────

export const cancelNotif = async (notifId: string): Promise<void> => {
  await api.delete(`/notifications/${notifId}`);
};

export const cancelNotifMasiva = async (
  tipo: NotifType,
  razon?: string,
): Promise<{ CancelledCount: number }> => {
  const params: Record<string, string> = { tipo };
  if (razon) params.razon = razon;
  const { data } = await api.delete('/notifications', { params });
  return data.data;
};
