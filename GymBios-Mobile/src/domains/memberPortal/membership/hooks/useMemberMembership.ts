import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { membershipApi } from '../infrastructure/membership.api';

export const memberMembershipKeys = {
  all: ['member-membership'] as const,
  current: (tenant: string | null) => [...memberMembershipKeys.all, 'current', tenant] as const,
};

export function useMemberMembership() {
  const activeTenant = useAuthStore((s) => s.activeTenant);

  return useQuery({
    queryKey: memberMembershipKeys.current(activeTenant),
    queryFn: () => membershipApi.getMemberMembership(),
  });
}
