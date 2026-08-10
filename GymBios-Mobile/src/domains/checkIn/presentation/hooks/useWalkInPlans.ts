import { useMemo } from 'react';

import { useMembershipPlans } from '../../../membershipPlans/hooks/useMembershipPlans';
import type { MembershipPlan } from '../../../membershipPlans/domain/MembershipPlan';

/**
 * Fetches all active membership plans that are of type "Walk-In".
 *
 * Walk-In plans are configured in Manage Plans with `planType === 'Walk-In'`.
 * This mirrors the web reference's: plansService.getPlans('Active').filter(p => p.planType === 'Walk-In')
 */
export function useWalkInPlans() {
  const { plans, loading, error } = useMembershipPlans('Active');

  const walkInPlans = useMemo(
    () => plans.filter((p: MembershipPlan) => p.planType === 'Walk-In'),
    [plans],
  );

  return { plans: walkInPlans, isLoading: loading, error };
}
