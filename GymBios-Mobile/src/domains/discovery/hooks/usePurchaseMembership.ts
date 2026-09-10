import { useMutation } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';
import type { PaymentResult } from '@/shared/payment/types';

export const usePurchaseMembership = () => {
  return useMutation({
    mutationFn: ({
      tenantSlug,
      branchId,
      planId,
      payment,
    }: {
      tenantSlug: string;
      branchId: number;
      planId: number;
      payment?: PaymentResult;
    }) => {
      return discoveryApi.purchaseMembership(tenantSlug, branchId, planId, payment);
    },
  });
};
