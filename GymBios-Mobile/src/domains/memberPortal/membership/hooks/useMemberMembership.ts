import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';

export const memberMembershipKeys = {
  all: ['member-membership'] as const,
  current: () => [...memberMembershipKeys.all, 'current'] as const,
};

export function useMemberMembership() {
  return useQuery({
    queryKey: memberMembershipKeys.current(),
    queryFn: () => membershipApi.getMemberMembership(),
  });
}
