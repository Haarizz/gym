import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { MembershipChangePreviewResponse } from '../domain/models';

export const MEMBERSHIP_PLAN_PREVIEW_QUERY_KEY = ['membership', 'plan-preview'];

export function useMembershipPlanChangePreview(planId?: number) {
  return useQuery<MembershipChangePreviewResponse, Error>({
    queryKey: [...MEMBERSHIP_PLAN_PREVIEW_QUERY_KEY, planId],
    queryFn: () => {
      if (!planId) throw new Error('Plan ID is required');
      return membershipApi.previewMembershipChange(planId);
    },
    enabled: !!planId,
    staleTime: 0, // Always fetch latest to ensure accurate price/discount
  });
}
