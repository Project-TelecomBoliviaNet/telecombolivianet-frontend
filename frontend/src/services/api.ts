import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // BUG A FIX: withCredentials=true es OBLIGATORIO para que el browser envíe
  // la cookie httpOnly del refresh token en el request POST /api/auth/refresh.
  // Sin esto, la cookie nunca llega al servidor y el refresh siempre falla con 401.
  withCredentials: true,
});

// ── Request: adjunta el access token JWT a cada petición ─────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: maneja 401 — renueva con refresh token (cookie httpOnly) ────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown)  => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  // BUG A FIX (prev review): copiar la cola antes de vaciarla
  const queue = [...failedQueue];
  failedQueue = [];
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        // BUG A FIX: POST /api/auth/refresh sin body — el refresh token
        // viaja automáticamente en la cookie httpOnly (withCredentials=true).
        // El servidor lee la cookie, valida el token y emite uno nuevo en cookie.
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        // El servidor retorna solo el nuevo access token en el body
        const newToken = data.data?.Token ?? data.Token;

        if (!newToken || typeof newToken !== 'string') {
          processQueue(new Error('Token de refresco inválido'), null);
          useAuthStore.getState().clearSession();
          if (window.location.pathname !== '/login') window.location.href = '/login';
          return Promise.reject(new Error('Token de refresco inválido'));
        }

        useAuthStore.getState().updateToken(newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearSession();
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
