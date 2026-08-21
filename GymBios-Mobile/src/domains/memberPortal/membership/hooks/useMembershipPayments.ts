import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';

export const MEMBERSHIP_PAYMENTS_QUERY_KEY = ['membership-payments'];

export function useMembershipPayments() {
  return useQuery({
    queryKey: MEMBERSHIP_PAYMENTS_QUERY_KEY,
    queryFn: membershipApi.getMembershipPayments,
  });
}
