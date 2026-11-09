import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store/authStore';

interface AuthMePermissions {
  permissions?: string[];
}

/**
 * Roles & Permissions keys (e.g. MEMBERS_CREATE) granted to the signed-in staff member
 * or trainer. Read live from /auth/me so an admin ticking a box takes effect without
 * signing out. Returns undefined until loaded, and for other roles.
 */
export function useMyPermissions(): string[] | undefined {
  const appRole = useAuthStore((s) => s.appRole);
  const enabled = appRole === 'staff' || appRole === 'trainer';
  const { data } = useQuery({
    queryKey: ['auth', 'me', 'permissions', appRole],
    queryFn: async () => (await apiClient.get<AuthMePermissions>('/auth/me')).data.permissions ?? [],
    enabled,
    staleTime: 60_000,
  });
  return enabled ? data : undefined;
}
