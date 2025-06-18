/**
 * AuthContext — compatibility shim over authStore (Zustand).
 *
 * Some pages were written expecting a React Context with a `user` object.
 * Rather than refactoring every call-site, this thin wrapper exposes the
 * same shape via a real Context so those pages compile without changes.
 *
 * New code should prefer `useAuthStore` directly.
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useShallow } from 'zustand/react/shallow';
import type { UserRole } from '@/types/auth.types';

// ── Shape exposed by the context ─────────────────────────────────────────────

export interface AuthUser {
  userId:   string;
  fullName: string;
  email:    string;
  role:     UserRole;
  /** Convenience array so `user.roles.includes('Admin')` works. */
  roles:    UserRole[];
}

interface AuthContextValue {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  logout:          () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // FIX-25: selectors granulares para evitar re-renders en cambios de estado no relacionados
  const {
    userId, role, fullName, email, isInitializing,
    initializeAuth, isAuthenticated, clearSession,
  } = useAuthStore(useShallow(s => ({
    userId:         s.userId,
    role:           s.role,
    fullName:       s.fullName,
    email:          s.email,
    isInitializing: s.isInitializing,
    initializeAuth: s.initializeAuth,
    isAuthenticated: s.isAuthenticated,
    clearSession:   s.clearSession,
  })));

  // FIX-07: al montar, intenta renovar el token usando la cookie httpOnly.
  // Mientras isInitializing=true mostramos un spinner para evitar redirección
  // prematura a /login antes de saber si la sesión sigue válida.
  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user: AuthUser | null =
    userId && role
      ? {
          userId,
          fullName: fullName ?? '',
          email:    email    ?? '',
          role,
          roles:    [role],
        }
      : null;

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isAuthenticated(),
        logout:          clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
