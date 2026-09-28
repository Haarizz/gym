import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';
import { toast } from '@/shared/components/Toasts/toastStore';

interface FreezeMembershipParams {
  durationDays: number;
  reason: string;
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: FreezeMembershipParams) =>
      membershipApi.freezeMembership(params.durationDays, params.reason),
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to freeze membership.';
      toast.error(message, { title: 'Freeze Failed' });
    },
  });
}
