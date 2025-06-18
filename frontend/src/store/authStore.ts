import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { UserRole } from '@/types/auth.types';

interface AuthState {
  // En memoria únicamente — no persiste en localStorage (FIX-07: seguridad XSS)
  token:        string | null;
  // Persiste en localStorage: datos no sensibles para mostrar UI sin refresh
  userId:       string | null;
  fullName:     string | null;
  email:        string | null;
  role:         UserRole | null;
  requiresPasswordChange: boolean;
  // true mientras se espera el refresh inicial al cargar la app
  isInitializing: boolean;

  setSession: (payload: {
    token:        string;
    userId:       string;
    fullName:     string;
    email:        string;
    role:         UserRole;
    requiresPasswordChange: boolean;
  }) => void;
  updateToken:        (token: string) => void;
  clearSession:       () => void;
  setPasswordChanged: () => void;
  isAuthenticated:    () => boolean;
  isAdmin:            () => boolean;
  isTecnico:          () => boolean;
  isSocioLectura:     () => boolean;
  // Intenta obtener un nuevo access token usando la cookie httpOnly del refresh
  initializeAuth:     () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:        null,
      userId:       null,
      fullName:     null,
      email:        null,
      role:         null,
      requiresPasswordChange: false,
      isInitializing: true,

      setSession: (payload) =>
        set({
          token:                  payload.token,
          userId:                 payload.userId,
          fullName:               payload.fullName,
          email:                  payload.email,
          role:                   payload.role,
          requiresPasswordChange: payload.requiresPasswordChange,
          isInitializing:         false,
        }),

      updateToken: (token) => set({ token }),

      clearSession: () =>
        set({
          token: null, userId: null,
          fullName: null, email: null, role: null,
          requiresPasswordChange: false,
          isInitializing: false,
        }),

      setPasswordChanged: () =>
        set({ requiresPasswordChange: false }),

      isAuthenticated: () => !!get().token,
      isAdmin:         () => get().role === 'Admin',
      isTecnico:       () => get().role === 'Tecnico',
      isSocioLectura:  () => get().role === 'SocioLectura',

      // Llamado al montar la app: si hay userId guardado (sesión previa),
      // intenta renovar el token usando la cookie httpOnly del refresh.
      // Si falla (cookie expirada), limpia la sesión y redirige a login.
      initializeAuth: async () => {
        const { userId } = get();
        if (!userId) {
          set({ isInitializing: false });
          return;
        }
        try {
          const { data } = await axios.post(
            '/api/auth/refresh',
            {},
            { withCredentials: true },
          );
          const newToken = data.data?.Token ?? data.Token;
          if (newToken && typeof newToken === 'string') {
            set({ token: newToken, isInitializing: false });
          } else {
            get().clearSession();
          }
        } catch {
          get().clearSession();
        }
      },
    }),
    {
      name: 'telecom-auth',
      // FIX-07: el access token NO se persiste en localStorage.
      // Solo se mantienen datos de UI (nombre, rol) para renderizar la interfaz
      // antes de que el refresh complete. La seguridad real la da el servidor.
      partialize: (state) => ({
        userId:                 state.userId,
        fullName:               state.fullName,
        email:                  state.email,
        role:                   state.role,
        requiresPasswordChange: state.requiresPasswordChange,
      }),
    }
  )
);
