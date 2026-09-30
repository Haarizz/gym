import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { MembershipChangePreviewResponse } from '../domain/models';

export const MEMBERSHIP_PLAN_PREVIEW_QUERY_KEY = ['membership', 'plan-preview'];

export function useMembershipPlanChangePreview(
  planId?: number,
  reward?: { rewardPassId?: number; couponCode?: string },
) {
  return useQuery<MembershipChangePreviewResponse, Error>({
    queryKey: [...MEMBERSHIP_PLAN_PREVIEW_QUERY_KEY, planId, reward?.rewardPassId, reward?.couponCode],
    queryFn: () => {
      if (!planId) throw new Error('Plan ID is required');
      return membershipApi.previewMembershipChange(planId, reward);
    },
    enabled: !!planId,
    staleTime: 0, // Always fetch latest to ensure accurate price/discount
    // Keep the last good price on screen while a new plan/reward is priced — and if a
    // picked Reward Pass/coupon is rejected, so the member can still deselect it.
    placeholderData: keepPreviousData,
    retry: (count, err: any) => !(err?.status >= 400 && err?.status < 500) && count < 3,
  });
}
