import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';
import { toast } from '@/shared/components/Toasts/toastStore';

export function useUnfreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => membershipApi.unfreezeMembership(),
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to unfreeze subscription.';
      toast.error(message, {
        title: 'Unfreeze Failed'
      });
    },
  });
}
