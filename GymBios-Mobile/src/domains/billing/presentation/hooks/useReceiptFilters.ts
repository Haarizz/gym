import { useCallback, useState } from 'react';

import type { ReceiptFilters } from '../../application/BillingRepository';

export type ReceiptSortField = 'date' | 'amount' | 'receiptNo';

export type ReceiptSortOrder = 'asc' | 'desc';

export interface UseReceiptFiltersReturn {
  search: string;
  statusFilter: string | undefined;
  typeFilter: string | undefined;
  sortField: ReceiptSortField;
  sortOrder: ReceiptSortOrder;
  apiFilters: ReceiptFilters;
  setSearch: (text: string) => void;
  setStatusFilter: (status: string | undefined) => void;
  setTypeFilter: (type: string | undefined) => void;
  setSortField: (field: ReceiptSortField) => void;
  toggleSortOrder: () => void;
  clearFilters: () => void;
}

/**
 * Presentation-only hook for the receipt list.
 * Manages search text, status / type chips, sort direction.
 * Never touches the network — all state is ephemeral UI state.
 */
export function useReceiptFilters(): UseReceiptFiltersReturn {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<ReceiptSortField>('date');
  const [sortOrder, setSortOrder] = useState<ReceiptSortOrder>('desc');

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setSortField('date');
    setSortOrder('desc');
  }, []);

  const apiFilters: ReceiptFilters = {
    search: search.trim() || undefined,
    status: statusFilter,
    transactionType: typeFilter,
    page: 1,
    limit: 50,
  };

  return {
    search,
    statusFilter,
    typeFilter,
    sortField,
    sortOrder,
    apiFilters,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    setSortField,
    toggleSortOrder,
    clearFilters,
  };
}
