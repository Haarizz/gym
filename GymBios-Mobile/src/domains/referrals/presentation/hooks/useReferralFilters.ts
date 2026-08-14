import { useState, useMemo } from 'react';

export type TierFilter = 'all' | 'platinum' | 'gold' | 'silver' | 'bronze';
export type DateRangeFilter = '7d' | '30d' | '90d' | 'all';
export type StatusFilter = 'all' | 'pending' | 'successful' | 'expired';

export interface UseReferralFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  tierFilter: TierFilter;
  setTierFilter: (tier: TierFilter) => void;
  dateRange: DateRangeFilter;
  setDateRange: (range: DateRangeFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  resetFilters: () => void;
}

export function useReferralFilters(): UseReferralFiltersReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('7d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const resetFilters = () => {
    setSearchTerm('');
    setTierFilter('all');
    setDateRange('7d');
    setStatusFilter('all');
  };

  return {
    searchTerm,
    setSearchTerm,
    tierFilter,
    setTierFilter,
    dateRange,
    setDateRange,
    statusFilter,
    setStatusFilter,
    resetFilters,
  };
}
