import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store/authStore';

interface AuthMePermissions {
  permissions?: string[];
}

/**
 * Whether the signed-in staff member or trainer may register new members. The server
 * enforces Roles & Permissions (MEMBERS_CREATE) on POST /members, so the dashboard
 * shortcut is only shown when their role has it. Read live from /auth/me so an admin
 * ticking the box takes effect without signing out.
 */
export function useCanCreateMembers(): boolean {
  const appRole = useAuthStore((s) => s.appRole);
  const enabled = appRole === 'staff' || appRole === 'trainer';
  const { data } = useQuery({
    queryKey: ['auth', 'me', 'permissions', appRole],
    queryFn: async () => (await apiClient.get<AuthMePermissions>('/auth/me')).data.permissions ?? [],
    enabled,
    staleTime: 60_000,
  });
  return enabled && !!data?.includes('MEMBERS_CREATE');
}
