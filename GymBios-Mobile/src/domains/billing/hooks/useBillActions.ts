import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Receipt } from '../domain';
import type { SettlePaymentRequest } from '../application/BillingRepository';
import { BillingService } from '../application/BillingService';
import { ApiBillingRepository } from '../infrastructure/ApiBillingRepository';

import { billingKeys } from './billingKeys';

const repository = new ApiBillingRepository();
const billingService = new BillingService(repository);

/**
 * Settle one or more pending bills for a member.
 * Invalidates only the affected queries — never the whole cache.
 */
export function useSettlePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SettlePaymentRequest) =>
      billingService.settlePayment(request),
    onSuccess: (_data, variables) => {
      // The member's pending bills and statement are directly affected.
      queryClient.invalidateQueries({
        queryKey: billingKeys.pendingBills(variables.memberDbId),
      });
      queryClient.invalidateQueries({
        queryKey: billingKeys.statement(variables.memberDbId),
      });
      // The receipts list and billing stats may have changed.
      queryClient.invalidateQueries({ queryKey: billingKeys.receipts });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats });
      // Member dues may have changed after settlement.
      queryClient.invalidateQueries({ queryKey: billingKeys.dues });
    },
  });
}

export type { Receipt, SettlePaymentRequest };