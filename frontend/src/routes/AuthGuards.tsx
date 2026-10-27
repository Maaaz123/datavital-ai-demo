import { Navigate, Outlet } from 'react-router-dom';
import UnauthorizedState from '@/components/common/UnauthorizedState';
import { useAuthStore } from '@/store/authStore';
import { useHasPermission } from '@/hooks/usePermission';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Keep security: hide unauthorized pages without auto-granting permissions. */
export function PermissionRoute({ permission }: { permission: string }) {
  const allowed = useHasPermission(permission);
  if (!allowed) {
    return <UnauthorizedState />;
  }
  return <Outlet />;
}
