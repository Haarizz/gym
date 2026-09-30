import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { familyApi } from '../infrastructure/familyApi';
import type { FamilyPurchaseRequest } from '../infrastructure/familyApi';
import { invalidateMembershipQueries } from '@/domains/memberPortal/membership/hooks/invalidateMembershipQueries';

export const usePurchaseFamilyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      tenantSlug,
      branchId,
      request,
      isPlanChange = false,
    }: {
      idempotencyKey: string;
      tenantSlug: string;
      branchId: number;
      request: FamilyPurchaseRequest;
      /** An existing member here switching plans, rather than a new member joining. */
      isPlanChange?: boolean;
    }) => {
      // The backend rejects a reused Idempotency-Key whose payload differs.
      const fingerprint = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(request),
      );
      return isPlanChange
        ? familyApi.convertToFamilyPlan(idempotencyKey, fingerprint, request)
        : familyApi.purchaseFamilyPlan(tenantSlug, branchId, idempotencyKey, fingerprint, request);
    },
    // The success screen routes back to the home tab, which is still mounted with
    // its pre-purchase "No Active Plan" data.
    onSuccess: () => {
      void invalidateMembershipQueries(queryClient);
    },
  });
};
