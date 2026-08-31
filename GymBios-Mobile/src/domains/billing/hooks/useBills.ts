import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BillingStats,
  Bill,
  MemberDue,
  Receipt,
  Statement,
} from '../domain';
import type {
  ReceiptFilters,
  ReceiptsPage,
  StatementRange,
} from '../application/BillingRepository';
import { BillingService } from '../application/BillingService';
import { ApiBillingRepository } from '../infrastructure/ApiBillingRepository';

import { billingKeys } from './billingKeys';
import { useBranchContext } from "@/shared/providers/BranchProvider";

const repository = new ApiBillingRepository();
const billingService = new BillingService(repository);

/**
 * Billing dashboard summary stats.
 */
export function useBillingStats() {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...(Array.isArray(billingKeys.stats) ? billingKeys.stats : [billingKeys.stats]), selectedBranchId],
    queryFn: () => billingService.getBillingStats(),
  });

  const stats = query.data;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { stats, loading, error, refresh };
}

/**
 * Paginated member receipts list.
 */
export function useReceipts(filters?: ReceiptFilters) {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...billingKeys.receipts, filters, selectedBranchId],
    queryFn: () => billingService.getMemberReceipts(filters),
  });

  const receipts = query.data?.receipts ?? [];
  const pagination = query.data?.pagination;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { receipts, pagination, loading, error, refresh };
}

/**
 * A single receipt detail. Initializes from cached list data when available.
 *
 * The query is **disabled** until a valid receipt ID (> 0) is provided.
 * This prevents spurious requests to `/receipts/0` or `/receipts/NaN`
 * when the ID has not yet been resolved from navigation params.
 */
export function useReceipt(id: number | undefined) {
    const { selectedBranchId } = useBranchContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...(Array.isArray(billingKeys.receipt(id)) ? billingKeys.receipt(id) : [billingKeys.receipt(id)]), selectedBranchId],
    queryFn: () => billingService.getReceipt(id!),
    enabled: id != null && id > 0,
    initialData: () => {
      const cached = queryClient
        .getQueryData<ReceiptsPage>(billingKeys.receipts)
        ?.receipts.find(r => r.id === String(id));
      return cached;
    },
  });

  const receipt = query.data;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { receipt, loading, error, refresh };
}

/**
 * List of members with overdue or upcoming payments.
 */
export function useMemberDues() {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...(Array.isArray(billingKeys.dues) ? billingKeys.dues : [billingKeys.dues]), selectedBranchId],
    queryFn: () => billingService.getMemberDues(),
  });

  const dues = query.data ?? [];
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { dues, loading, error, refresh };
}

/**
 * A member's full Statement of Account.
 *
 * The query is **disabled** until a valid member database ID (> 0) is
 * provided.  Screens that generate statements on explicit user action
 * (e.g. pressing "Generate Statement") pass `undefined` until the user
 * has selected a member, which keeps the query dormant and prevents
 * requests to `/billing/member/0/statement`.
 */
export function useMemberStatement(
  memberId: number | undefined,
  range?: StatementRange,
) {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...billingKeys.statement(memberId), range, selectedBranchId],
    queryFn: () => billingService.getMemberStatement(memberId!, range),
    enabled: memberId != null && memberId > 0,
  });

  const statement = query.data;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { statement, loading, error, refresh };
}

/**
 * Pending/partial bills for a specific member.
 *
 * The query is **disabled** until a valid member database ID (> 0) is
 * provided.  Screens that search for a member first (e.g. Create Receipt)
 * pass `undefined` until a member is selected, which keeps the query
 * dormant and prevents requests to `/billing/member/0/pending-bills`.
 */
export function usePendingBills(memberId: number | undefined) {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...(Array.isArray(billingKeys.pendingBills(memberId)) ? billingKeys.pendingBills(memberId) : [billingKeys.pendingBills(memberId)]), selectedBranchId],
    queryFn: () => billingService.getPendingBills(memberId!),
    enabled: memberId != null && memberId > 0,
  });

  const bills = query.data ?? [];
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { bills, loading, error, refresh };
}

export type {
  BillingStats,
  Bill,
  MemberDue,
  Receipt,
  Statement,
};
