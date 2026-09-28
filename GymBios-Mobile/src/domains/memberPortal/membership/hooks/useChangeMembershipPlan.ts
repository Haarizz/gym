import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { MembershipChangeRequest } from '../domain/models';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';

export function useChangeMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, MembershipChangeRequest>({
    mutationFn: membershipApi.changeMembershipPlan,
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
  });
}
