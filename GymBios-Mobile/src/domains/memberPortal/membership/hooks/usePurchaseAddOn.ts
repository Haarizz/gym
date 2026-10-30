import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../infrastructure/membership.api';
import type { PaymentResult } from '@/shared/payment/types';
import type { AddOnCheckout } from '../domain/models';
import { walletKeys } from '../../wallet/useMyWallet';
import { invalidateMembershipQueries } from './invalidateMembershipQueries';

export function usePurchaseAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    /** `paymentResult` is absent when the code and wallet cover the whole price. */
    mutationFn: async ({ checkout, paymentResult }: { checkout: AddOnCheckout; paymentResult?: PaymentResult }) =>
      membershipApi.purchaseAddOn(checkout.addOn.id, {
        couponCode: checkout.couponCode,
        walletAmount: checkout.walletApplied > 0 ? checkout.walletApplied : undefined,
        expectedAmount: checkout.net,
        paymentMethodUsed: paymentResult?.paymentMethodUsed,
        paymentBreakdown: paymentResult?.paymentBreakdown,
        paidAmount: paymentResult?.summary.paidAmount,
        bankAccountCode: paymentResult?.bankAccountCode,
        bankAccountName: paymentResult?.bankAccountName,
        paymentDueDate: paymentResult?.summary.paymentDueDate,
      }),
    onSettled: () => {
      // A refused purchase may still mean the balance moved elsewhere.
      void queryClient.invalidateQueries({ queryKey: walletKeys.mine });
    },
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
  });
}
