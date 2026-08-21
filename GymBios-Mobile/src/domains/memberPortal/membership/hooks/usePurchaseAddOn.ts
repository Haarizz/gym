import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import type { PaymentResult } from '@/shared/payment/types';

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
      // Invalidate Phase 3A active add-ons
      queryClient.invalidateQueries({ queryKey: ['member-addons'] });
      // Invalidate Phase 2A payment history
      queryClient.invalidateQueries({ queryKey: ['membership-payments'] });
    },
  });
}
