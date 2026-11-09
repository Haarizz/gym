import { useMyPermissions } from '@/domains/auth/hooks/useMyPermissions';

/**
 * Whether the signed-in staff member or trainer may check members in. The server
 * accepts CHECK_IN_CREATE or ATTENDANCE_CREATE on POST /checkin (ModulePermissionRules),
 * so the dashboard shortcut is only shown when their role has one of them.
 */
export function useCanCheckInMembers(): boolean {
  const permissions = useMyPermissions();
  return !!permissions?.some((p) => p === 'CHECK_IN_CREATE' || p === 'ATTENDANCE_CREATE');
}
