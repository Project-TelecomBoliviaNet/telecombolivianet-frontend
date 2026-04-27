import api from './api';
import type {
  UserSystemDto,
  CreateUserRequest,
  UpdateUserRequest,
  PagedResult,
  ApiResponse,
  ProfilePermissionsDto,
} from '@/types/auth.types';

// ── M7: nuevos tipos ──────────────────────────────────────────────────────────

export type UserRoleKey = 'Admin' | 'Operador' | 'Tecnico' | 'SocioLectura';

export const ROLE_LABELS: Record<UserRoleKey, string> = {
  Admin:        'Administrador',
  Operador:     'Operador de Cobros',
  Tecnico:      'Técnico',
  SocioLectura: 'Socio / Lectura',
};

export const ROLE_COLORS: Record<UserRoleKey, string> = {
  Admin:        'bg-purple-100 text-purple-800 border-purple-200',
  Operador:     'bg-green-100 text-green-800 border-green-200',
  Tecnico:      'bg-blue-100 text-blue-800 border-blue-200',
  SocioLectura: 'bg-gray-100 text-gray-700 border-gray-200',
};

export interface RolePermissionsDto {
  Role:        string;
  Label:       string;
  Descripcion: string;
  Modulos:     string[];
  Politicas:   string[];
}

export interface UserSystemDetailDto extends UserSystemDto {
  RoleLabel:  string;
  IsDeleted:  boolean;
  DeletedAt:  string | null;
}

export interface ForgotPasswordResultDto {
  Message: string;
  Channel: string;
  SentTo:  string | null;
}

// ── Funciones existentes + M7 ─────────────────────────────────────────────────

export const userService = {
  // US-05 · Listar usuarios paginado — M7: filtros por rol y búsqueda
  getAll: async (
    page = 1,
    pageSize = 20,
    role?: string,
    search?: string,
  ): Promise<PagedResult<UserSystemDto>> => {
    const params: Record<string, unknown> = { page, pageSize };
    if (role)   params.role   = role;
    if (search) params.search = search;
    const res = await api.get<ApiResponse<PagedResult<UserSystemDto>>>(
      '/users', { params });
    return res.data.data!;
  },

  // US-05 · Obtener por ID
  getById: async (id: string): Promise<UserSystemDto> => {
    const res = await api.get<ApiResponse<UserSystemDto>>(`/users/${id}`);
    return res.data.data!;
  },

  // US-USR-01: Detalle completo (incluye IsDeleted, RoleLabel)
  getDetail: async (id: string): Promise<UserSystemDetailDto> => {
    const res = await api.get<ApiResponse<UserSystemDetailDto>>(`/users/${id}/detail`);
    return res.data.data!;
  },

  // US-05 · Crear
  create: async (data: CreateUserRequest): Promise<UserSystemDto> => {
    const res = await api.post<ApiResponse<UserSystemDto>>('/users', data);
    return res.data.data!;
  },

  // US-05 · Editar
  update: async (id: string, data: UpdateUserRequest): Promise<UserSystemDto> => {
    const res = await api.put<ApiResponse<UserSystemDto>>(`/users/${id}`, data);
    return res.data.data!;
  },

  // US-05 · Desactivar
  deactivate: async (id: string): Promise<void> => {
    await api.put(`/users/${id}/deactivate`);
  },

  // US-05 · Reactivar
  reactivate: async (id: string): Promise<void> => {
    await api.put(`/users/${id}/reactivate`);
  },

  // US-06 · Desbloquear
  unlock: async (id: string): Promise<void> => {
    await api.put(`/users/${id}/unlock`);
  },

  // M7 — US-USR-01: Baja lógica
  softDelete: async (id: string, justificacion: string): Promise<void> => {
    await api.delete(`/users/${id}`, { data: { Justificacion: justificacion } });
  },

  // M7 — US-USR-01: Force reset password
  forceResetPassword: async (id: string, newTemporaryPassword: string): Promise<void> => {
    await api.post(`/users/${id}/force-reset-password`, { NewTemporaryPassword: newTemporaryPassword });
  },

  // M7 — US-ROL-PERMISOS: Matriz de permisos
  getPermissions: async (): Promise<RolePermissionsDto[]> => {
    const res = await api.get<ApiResponse<RolePermissionsDto[]>>('/users/permissions');
    return res.data.data!;
  },

  // M7 — US-USR-RECOVERY: Solicitar recuperación
  forgotPassword: async (email: string): Promise<ForgotPasswordResultDto> => {
    const res = await api.post<ApiResponse<ForgotPasswordResultDto>>(
      '/users/forgot-password', { Email: email });
    return res.data.data!;
  },

  // M7 — US-USR-RECOVERY: Resetear contraseña con token
  resetPassword: async (
    token: string, newPassword: string, confirmPassword: string,
  ): Promise<void> => {
    await api.post('/users/reset-password', { Token: token, NewPassword: newPassword, ConfirmPassword: confirmPassword });
  },

  getProfile: async (): Promise<UserSystemDto> => {
    const res = await api.get<{ data: UserSystemDto }>('/profile');
    return res.data.data;
  },

  getMyPermissions: async (): Promise<ProfilePermissionsDto | null> => {
    try {
      const res = await api.get<{ data: ProfilePermissionsDto }>('/profile/permissions');
      return res.data.data;
    } catch {
      return null;
    }
  },
};
