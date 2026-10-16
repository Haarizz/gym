import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';
import { toast } from '@/shared/components/Toasts/toastStore';
import { formatDate, i18n } from '@/core/i18n';
import { formatAmount } from '@/domains/membershipPayment/domain/settlementRules';

interface FreezeMembershipParams {
  durationDays: number;
  reason: string;
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: FreezeMembershipParams) =>
      membershipApi.freezeMembership(params.durationDays, params.reason),
    onSuccess: (result) => {
      void invalidateMembershipQueries(queryClient);
      const until = result.freezeEnd ? formatDate(result.freezeEnd, 'PP') : null;
      const frozen = until
        ? i18n.t('membership.freezeModal.frozenForUntil', { count: result.days, date: until })
        : i18n.t('membership.freezeModal.frozenFor', { count: result.days });
      toast.success(
        result.chargeAmount > 0
          ? `${frozen} ${i18n.t('membership.freezeModal.frozenCharge', {
              amount: formatAmount(result.chargeAmount),
              days: result.chargedDays,
            })}`
          : frozen,
        { title: i18n.t('membership.freezeModal.frozenTitle') },
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || i18n.t('membership.freezeModal.freezeFailed');
      toast.error(message, { title: i18n.t('membership.freezeModal.freezeFailedTitle') });
    },
  });
}
