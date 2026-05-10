import api from './api';
import type {
  SlotDto, InstalacionListItemDto, InstalacionDetalleDto,
  PagedResult, InstalacionFilterDto, CrearInstalacionAdminDto,
} from '@/types/installation.types';

export type {
  InstallationStatus, SlotDto, InstalacionListItemDto, InstalacionDetalleDto,
  PagedResult, InstalacionFilterDto, CrearInstalacionAdminDto,
} from '@/types/installation.types';
export { STATUS_LABEL, STATUS_COLOR } from '@/types/installation.types';

// ── API calls ─────────────────────────────────────────────────────────────────

export const getSlotsDisponibles = async (dias = 14): Promise<SlotDto[]> => {
  const { data } = await api.get('/instalaciones/slots-disponibles', { params: { dias } });
  return data.data;
};

export const getInstalaciones = async (
  filter: InstalacionFilterDto = {}
): Promise<PagedResult<InstalacionListItemDto>> => {
  const { data } = await api.get('/instalaciones', { params: filter });
  return data.data;
};

export const getInstalacion = async (id: string): Promise<InstalacionDetalleDto> => {
  const { data } = await api.get(`/instalaciones/${id}`);
  return data.data;
};

export const crearInstalacion = async (
  dto: CrearInstalacionAdminDto
): Promise<InstalacionDetalleDto> => {
  const { data } = await api.post('/instalaciones/admin', dto);
  return data.data;
};

export const cancelarInstalacion = async (
  id: string, motivo: string
): Promise<void> => {
  await api.patch(`/instalaciones/${id}/cancelar`, {
    MotivoCancelacion: motivo,
    CanceladoPor: 'ADMIN',
  });
};

export const completarInstalacion = async (
  id: string, notasTecnico?: string
): Promise<void> => {
  await api.patch(`/instalaciones/${id}/completar`, { NotasTecnico: notasTecnico });
};

export const reprogramarInstalacion = async (
  id: string, fecha: string, horaInicio: string, motivo?: string
): Promise<void> => {
  await api.patch(`/instalaciones/${id}/reprogramar`, { Fecha: fecha, HoraInicio: horaInicio, Motivo: motivo });
};

export const asignarTecnico = async (
  id: string, tecnicoId: string
): Promise<void> => {
  await api.patch(`/instalaciones/${id}/tecnico`, { TecnicoId: tecnicoId });
};
