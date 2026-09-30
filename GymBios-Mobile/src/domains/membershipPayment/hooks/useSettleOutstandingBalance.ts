import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import type { SettleOutstandingBalanceRequest } from '../domain/types';
import { toSettlementError } from '../infrastructure/settlementErrors';
import { invalidateAfterSettlement, membershipPaymentKeys } from './membershipPaymentKeys';
import { membershipPaymentService } from './membershipPaymentService';

/**
 * Settles the membership's outstanding balance.
 *
 * Each distinct payment attempt gets one Idempotency-Key, kept until the backend
 * gives a definitive answer. If the connection drops mid-request, calling settle()
 * again with the same payment reuses the key, so the backend returns the already-
 * recorded payment instead of taking a second one.
 */
export function useSettleOutstandingBalance(membershipId: number) {
  const queryClient = useQueryClient();
  const attemptRef = useRef<{ key: string; payload: string; request: SettleOutstandingBalanceRequest } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ key, request }: { key: string; request: SettleOutstandingBalanceRequest }) =>
      membershipPaymentService.settle(membershipId, key, request),
    onSuccess: () => {
      attemptRef.current = null;
      void invalidateAfterSettlement(queryClient);
    },
    onError: (error) => {
      if (toSettlementError(error).kind !== 'network') {
        attemptRef.current = null;
      }
      // Whatever happened, show the real balance next (it may have changed or been paid).
      void queryClient.invalidateQueries({ queryKey: membershipPaymentKeys.all });
    },
  });

  const settle = useCallback(
    (request: SettleOutstandingBalanceRequest) => {
      if (mutation.isPending) return;
      const payload = JSON.stringify(request);
      if (!attemptRef.current || attemptRef.current.payload !== payload) {
        attemptRef.current = { key: Crypto.randomUUID(), payload, request };
      }
      mutation.mutate({ key: attemptRef.current.key, request });
    },
    [mutation],
  );

  /** Re-sends the last attempt unchanged (same key) — for after a lost connection. */
  const retry = useCallback(() => {
    const attempt = attemptRef.current;
    if (!attempt || mutation.isPending) return;
    mutation.mutate({ key: attempt.key, request: attempt.request });
  }, [mutation]);

  return {
    settle,
    retry,
    result: mutation.data,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? toSettlementError(mutation.error) : null,
    reset: mutation.reset,
  };
}
