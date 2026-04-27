import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/auth.types';

interface AuthState {
  token:        string | null;
  userId:       string | null;
  fullName:     string | null;
  email:        string | null;
  role:         UserRole | null;
  requiresPasswordChange: boolean;

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

      setSession: (payload) =>
        set({
          token:                  payload.token,
          userId:                 payload.userId,
          fullName:               payload.fullName,
          email:                  payload.email,
          role:                   payload.role,
          requiresPasswordChange: payload.requiresPasswordChange,
        }),

      updateToken: (token) => set({ token }),

      clearSession: () =>
        set({
          token: null, userId: null,
          fullName: null, email: null, role: null,
          requiresPasswordChange: false,
        }),

      setPasswordChanged: () =>
        set({ requiresPasswordChange: false }),

      isAuthenticated: () => !!get().token,
      isAdmin:         () => get().role === 'Admin',
      isTecnico:       () => get().role === 'Tecnico',
      isSocioLectura:  () => get().role === 'SocioLectura',
    }),
    {
      name: 'telecom-auth',
      partialize: (state) => ({
        token:                  state.token,
        userId:                 state.userId,
        fullName:               state.fullName,
        email:                  state.email,
        role:                   state.role,
        requiresPasswordChange: state.requiresPasswordChange,
      }),
    }
  )
);
