import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth.types';

export interface AuthUser {
  userId:   string;
  fullName: string;
  email:    string;
  role:     UserRole;
  roles:    UserRole[];
}

interface AuthContextValue {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  logout:          () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();

  const user: AuthUser | null =
    store.userId && store.role
      ? {
          userId:   store.userId,
          fullName: store.fullName ?? '',
          email:    store.email    ?? '',
          role:     store.role,
          roles:    [store.role],
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: store.isAuthenticated(),
        logout:          store.clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
