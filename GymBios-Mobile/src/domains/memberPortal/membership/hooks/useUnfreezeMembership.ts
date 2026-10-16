import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';
import { toast } from '@/shared/components/Toasts/toastStore';
import { i18n } from '@/core/i18n';

export function useUnfreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => membershipApi.unfreezeMembership(),
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || i18n.t('membership.freezeModal.unfreezeFailed');
      toast.error(message, {
        title: i18n.t('membership.freezeModal.unfreezeFailedTitle'),
      });
    },
  });
}
