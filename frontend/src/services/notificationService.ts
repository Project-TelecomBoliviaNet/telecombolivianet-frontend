import api from './api';
import type {
  NotifType, PlantillaCategoria, HsmStatus,
  NotifConfigDto, NotifConfigListDto, NotifPlantillaDto,
  NotifLogPageDto, NotifSegmentDto, SegmentConditionGroup,
  PlantillaPreviewDto,
} from '@/types/notification.types';

export type {
  NotifType, PlantillaCategoria, HsmStatus, SegmentOperator, SegmentCampo,
  SegmentCondition, SegmentConditionGroup, NotifSegmentDto,
  NotifConfigDto, NotifConfigListDto, NotifPlantillaDto,
  NotifLogItemDto, NotifLogPageDto, PlantillaPreviewDto,
} from '@/types/notification.types';
export {
  NOTIF_TYPE_LABELS, NOTIF_TYPES_ACTIVOS,
  HSM_STATUS_COLORS, CATEGORIA_LABELS, ALL_VARIABLES,
} from '@/types/notification.types';

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
  hsmStatus: HsmStatus = 'Pendiente',
  metaTemplateName: string | null = null,
  metaLanguageCode: string | null = 'es',
  metaParamOrder: string | null = null,
): Promise<void> => {
  await api.put(`/config/notifications/templates/${tipo}`, {
    Texto: texto,
    Categoria: categoria,
    HsmStatus: hsmStatus,
    MetaTemplateName: metaTemplateName,
    MetaLanguageCode: metaLanguageCode,
    MetaParamOrder: metaParamOrder,
  });
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
