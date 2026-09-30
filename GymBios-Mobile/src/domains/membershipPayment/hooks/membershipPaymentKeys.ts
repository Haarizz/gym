import type { QueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';
import { memberMembershipKeys } from '@/domains/memberPortal/membership/hooks/useMemberMembership';
import { MEMBERSHIP_PAYMENTS_QUERY_KEY } from '@/domains/memberPortal/membership/hooks/useMembershipPayments';

export const membershipPaymentKeys = {
  all: ['membership-payment'] as const,
  outstandingBalance: (tenant: string | null, membershipId?: number) =>
    [...membershipPaymentKeys.all, 'outstanding-balance', tenant, membershipId ?? 'current'] as const,
};

/**
 * Everything a settlement changes: the balance itself, the membership card, the
 * Payments tab (new settlement receipt) and the member home dashboard (which
 * shows the outstanding balance). Nothing else.
 */
export function invalidateAfterSettlement(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: membershipPaymentKeys.all }),
    queryClient.invalidateQueries({ queryKey: memberMembershipKeys.all }),
    queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PAYMENTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'member'] }),
  ]);
}
