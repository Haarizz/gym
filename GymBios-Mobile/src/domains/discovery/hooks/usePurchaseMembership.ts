import { useMutation } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';

export const usePurchaseMembership = () => {
  return useMutation({
    mutationFn: ({ tenantSlug, branchId, planId }: { tenantSlug: string; branchId: number; planId: number }) => {
      return discoveryApi.purchaseMembership(tenantSlug, branchId, planId);
    },
  });
};
