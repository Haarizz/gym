import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';
import { toast } from '@/shared/components/Toasts/toastStore';
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
      const until = result.freezeEnd ? new Date(result.freezeEnd).toLocaleDateString() : null;
      const frozen = `Subscription frozen for ${result.days} days${until ? ` (until ${until})` : ''}.`;
      toast.success(
        result.chargeAmount > 0
          ? `${frozen} ${formatAmount(result.chargeAmount)} for ${result.chargedDays} extra freeze days was added to your outstanding balance.`
          : frozen,
        { title: 'Subscription Frozen' },
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to freeze subscription.';
      toast.error(message, { title: 'Freeze Failed' });
    },
  });
}
