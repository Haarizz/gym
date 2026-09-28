import type { QueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';
import { memberMembershipKeys } from './useMemberMembership';
import { memberAddOnKeys } from './useMemberAddOns';
import { MEMBERSHIP_PAYMENTS_QUERY_KEY } from './useMembershipPayments';

/**
 * Every member screen that reflects the member's plan. Tab screens stay mounted,
 * so anything left out here keeps showing its cached pre-purchase state (e.g. the
 * home dashboard's "No Active Plan") until its staleTime runs out.
 */
export function invalidateMembershipQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: memberMembershipKeys.all }),
    queryClient.invalidateQueries({ queryKey: memberAddOnKeys.all }),
    queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PAYMENTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ['membership-approval-status'] }),
    queryClient.invalidateQueries({ queryKey: ['current-member'] }),
  ]);
}
