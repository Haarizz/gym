import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { memberMembershipKeys } from './useMemberMembership';
import { toast } from '@/shared/components/Toasts/toastStore';

export function useUnfreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => membershipApi.unfreezeMembership(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberMembershipKeys.all });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to unfreeze membership.';
      toast.error(message, {
        title: 'Unfreeze Failed'
      });
    },
  });
}
