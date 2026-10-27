import { useAuthStore } from '@/store/authStore';

/** True when the signed-in user holds the given permission (or is superuser). */
export function useHasPermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.is_superuser) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export default useHasPermission;
