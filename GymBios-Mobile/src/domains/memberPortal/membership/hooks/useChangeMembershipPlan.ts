import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { MembershipChangeRequest } from '../domain/models';
import { memberMembershipKeys } from './useMemberMembership';
import { MEMBERSHIP_PAYMENTS_QUERY_KEY } from './useMembershipPayments';

export function useChangeMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, MembershipChangeRequest>({
    mutationFn: membershipApi.changeMembershipPlan,
    onSuccess: () => {
      // Invalidate membership state and payment history after success
      queryClient.invalidateQueries({ queryKey: memberMembershipKeys.all });
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PAYMENTS_QUERY_KEY });
    },
  });
}
