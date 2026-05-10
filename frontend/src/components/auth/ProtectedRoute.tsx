/**
 * ProtectedRoute — auth guard + RBAC guard.
 *
 * Usage:
 *   <ProtectedRoute>                          → only requires authentication
 *   <ProtectedRoute allowedRoles={['Admin']}> → requires auth + specific role
 *
 * On unauthenticated access  → redirect to /login (preserving the intended URL)
 * On unauthorised role       → redirect to /403
 */

import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth.types';

interface ProtectedRouteProps {
  children:      ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location       = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const role            = useAuthStore((s) => s.role);

  // ── Not logged in → go to login, preserving intended path ────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Logged in but role not allowed ────────────────────────────────────────
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
