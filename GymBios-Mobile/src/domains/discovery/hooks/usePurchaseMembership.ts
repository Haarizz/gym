import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';
import type { PaymentResult } from '@/shared/payment/types';
import { invalidateMembershipQueries } from '@/domains/memberPortal/membership/hooks/invalidateMembershipQueries';

export const usePurchaseMembership = () => {
  const queryClient = useQueryClient();

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
    // Refresh the approval gate (a Cash/Credit/Mixed purchase flips the gym to
    // PENDING) and every screen showing the plan, e.g. the already-mounted home tab.
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
  });
};
