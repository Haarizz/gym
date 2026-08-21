import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { MobileMembershipPlanPage } from '../domain/models';

export const MEMBERSHIP_PLANS_QUERY_KEY = ['membership', 'plans'];

export function useMembershipPlans(page: number = 1, limit: number = 10, search?: string) {
  return useQuery<MobileMembershipPlanPage, Error>({
    queryKey: [...MEMBERSHIP_PLANS_QUERY_KEY, page, limit, search],
    queryFn: () => membershipApi.getMembershipPlans(page, limit, search),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData, // smooth pagination
  });
}
