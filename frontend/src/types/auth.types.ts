// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole   = 'Admin' | 'Tecnico' | 'SocioLectura';
export type UserStatus = 'Activo' | 'Bloqueado' | 'Inactivo' | 'PendienteActivacion';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  Email:    string;
  Password: string;
}

export interface LoginResponse {
  Token:                  string;
  /**
   * BUG A FIX: El refresh token ya NO se retorna en el body de la respuesta.
   * Viaja exclusivamente como cookie httpOnly (inaccesible para JS → inmune a XSS).
   * Este campo queda como string vacío en la respuesta del servidor.
   * Mantenido en la interfaz por compatibilidad con el tipo genérico, pero NO
   * debe almacenarse ni usarse en el frontend.
   */
  RefreshToken:           string;
  UserId:                 string;
  FullName:               string;
  Email:                  string;
  Role:                   UserRole;
  RequiresPasswordChange: boolean;
  RedirectUrl:            string;
}

export interface AuthUser {
  UserId:   string;
  FullName: string;
  Role:     UserRole;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserSystemDto {
  Id:                     string;
  FullName:               string;
  Email:                  string;
  Role:                   UserRole;
  Status:                 UserStatus;
  RequiresPasswordChange: boolean;
  FailedLoginAttempts:    number;
  LastLoginAt:            string | null;
  CreatedAt:              string;
  /** Número WhatsApp del técnico/admin para notificaciones de tickets asignados. */
  Phone:                  string | null;
}

export interface CreateUserRequest {
  FullName:          string;
  Email:             string;
  TemporaryPassword: string;
  Role:              UserRole;
}

export interface UpdateUserRequest {
  FullName: string;
  Email:    string;
  Role:     UserRole;
  /** Número WhatsApp con código país (ej: 59170000000). Requerido para técnicos. */
  Phone?:   string | null;
}

export interface ChangePasswordRequest {
  CurrentPassword: string;
  NewPassword:     string;
  ConfirmPassword: string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLogDto {
  Id:           string;
  UserId:       string | null;
  UserName:     string;
  Module:       string;
  Action:       string;
  Description:  string;
  IpAddress:    string | null;
  PreviousData: string | null;
  NewData:      string | null;
  CreatedAt:    string;
}

// ── Paginación ────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  Items:       T[];
  TotalCount:  number;
  PageNumber:  number;
  PageSize:    number;
  TotalPages:  number;
  HasPreviousPage: boolean;
  HasNextPage:     boolean;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ProfilePermissionsDto {
  Role:        string;
  UserId:      string;
  Permissions: string[];
}

// ── API wrapper ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
  errors?:  string[];
}
