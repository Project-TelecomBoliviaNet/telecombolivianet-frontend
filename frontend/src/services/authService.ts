import api from './api';
import type {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ApiResponse,
} from '@/types/auth.types';

/**
 * BUG A FIX: authService actualizado para el flujo de cookie httpOnly.
 *
 * - login: ya no extrae refreshToken del body (el server lo emite como cookie).
 * - logout: ya NO envía refreshToken en el body — el server lo lee de la cookie.
 * - La importación de useAuthStore se elimina de este archivo (no se necesita
 *   el refreshToken almacenado localmente porque el browser lo gestiona).
 */
export const authService = {
  // US-01 · Login — retorna access token + datos de sesión.
  // El refresh token llega como cookie httpOnly (invisible para JS).
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return res.data.data!;
  },

  // US-03 · Logout — el servidor lee el refresh token de la cookie httpOnly y lo revoca.
  // No se envía nada en el body — la cookie viaja automáticamente (withCredentials=true).
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  // US-07 / US-08 · Cambio de contraseña
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.put('/auth/change-password', data);
  },

  // US-04 · Verificar sesión activa
  me: async () => {
    const res = await api.get<ApiResponse<{ UserId: string; FullName: string; Role: string }>>('/auth/me');
    return res.data.data!;
  },
};
