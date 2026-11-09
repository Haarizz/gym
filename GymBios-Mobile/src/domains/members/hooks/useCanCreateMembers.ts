import { useMyPermissions } from '@/domains/auth/hooks/useMyPermissions';

/**
 * Whether the signed-in staff member or trainer may register new members. The server
 * enforces Roles & Permissions (MEMBERS_CREATE) on POST /members, so the dashboard
 * shortcut is only shown when their role has it.
 */
export function useCanCreateMembers(): boolean {
  return !!useMyPermissions()?.includes('MEMBERS_CREATE');
}
