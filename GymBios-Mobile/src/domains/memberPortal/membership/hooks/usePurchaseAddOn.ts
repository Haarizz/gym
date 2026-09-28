import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import type { PaymentResult } from '@/shared/payment/types';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';

export function usePurchaseAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ addonId, paymentResult }: { addonId: number; paymentResult: PaymentResult }) => {
      const payload = {
        paymentMethodUsed: paymentResult.paymentMethodUsed,
        paymentBreakdown: paymentResult.paymentBreakdown,
        paidAmount: paymentResult.summary.paidAmount,
      };
      return await membershipApi.purchaseAddOn(addonId, payload);
    },
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
  });
}
