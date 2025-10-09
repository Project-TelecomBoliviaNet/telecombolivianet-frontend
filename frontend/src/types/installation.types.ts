export type InstallationStatus =
  | 'Pendiente'
  | 'EnProceso'
  | 'Completada'
  | 'Cancelada'
  | 'Reprogramada';

export const STATUS_LABEL: Record<InstallationStatus, string> = {
  Pendiente:    'Pendiente',
  EnProceso:    'En proceso',
  Completada:   'Completada',
  Cancelada:    'Cancelada',
  Reprogramada: 'Reprogramada',
};

export const STATUS_COLOR: Record<InstallationStatus, string> = {
  Pendiente:    'bg-blue-100 text-blue-800',
  EnProceso:    'bg-amber-100 text-amber-800',
  Completada:   'bg-green-100 text-green-800',
  Cancelada:    'bg-red-100 text-red-700',
  Reprogramada: 'bg-purple-100 text-purple-800',
};

export interface SlotDto {
  Fecha:       string;
  HoraInicio:  string;
  HoraFin:     string;
  Disponibles: number;
  Disponible:  boolean;
}

export interface InstalacionListItemDto {
  Id:            string;
  ClienteTbn:    string;
  ClienteNombre: string;
  PlanNombre:    string;
  Fecha:         string;
  HoraInicio:    string;
  Status:        InstallationStatus;
  TecnicoNombre: string | null;
  TicketId:      string | null;
  CreadoAt:      string;
}

export interface InstalacionDetalleDto {
  Id:                string;
  ClienteTbn:        string;
  ClienteNombre:     string;
  ClientePhone:      string;
  PlanNombre:        string;
  Fecha:             string;
  HoraInicio:        string;
  HoraFin:           string;
  DuracionMin:       number;
  Direccion:         string;
  Notas:             string | null;
  Status:            InstallationStatus;
  TecnicoNombre:     string | null;
  TecnicoId:         string | null;
  TicketId:          string | null;
  MotivoCancelacion: string | null;
  CanceladoPor:      string | null;
  CreadoAt:          string;
}

export interface PagedResult<T> {
  Items:      T[];
  TotalCount: number;
  PageNumber: number;
  PageSize:   number;
  TotalPages: number;
}

export interface InstalacionFilterDto {
  status?:    string;
  fecha?:     string;
  tecnicoId?: string;
  clienteId?: string;
  page?:      number;
  pageSize?:  number;
}

export interface CrearInstalacionAdminDto {
  ClienteId:   string;
  PlanId:      string;
  Fecha:       string;
  HoraInicio:  string;
  DuracionMin?: number;
  Direccion:   string;
  Notas?:      string;
  TecnicoId?:  string;
}
