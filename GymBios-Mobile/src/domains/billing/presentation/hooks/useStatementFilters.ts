import { useCallback, useState } from 'react';

import type { StatementRange } from '../../application/BillingRepository';

export type StatementPeriod = 'all' | '30d' | '90d' | '6m' | '1y' | 'custom';

export interface UseStatementFiltersReturn {
  period: StatementPeriod;
  customFrom: string | undefined;
  customTo: string | undefined;
  range: StatementRange | undefined;
  setPeriod: (period: StatementPeriod) => void;
  setCustomFrom: (date: string | undefined) => void;
  setCustomTo: (date: string | undefined) => void;
  reset: () => void;
}

function periodToRange(period: StatementPeriod): StatementRange | undefined {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (period) {
    case 'all':
      return undefined;
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: fmt(from), to: fmt(now) };
    }
    case '90d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { from: fmt(from), to: fmt(now) };
    }
    case '6m': {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      return { from: fmt(from), to: fmt(now) };
    }
    case '1y': {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      return { from: fmt(from), to: fmt(now) };
    }
    default:
      return undefined;
  }
}

/**
 * Presentation-only hook for the Member Statement date filter.
 * Derives the StatementRange to pass to useMemberStatement().
 * No network calls — pure local state.
 */
export function useStatementFilters(): UseStatementFiltersReturn {
  const [period, setPeriod] = useState<StatementPeriod>('all');
  const [customFrom, setCustomFrom] = useState<string | undefined>(undefined);
  const [customTo, setCustomTo] = useState<string | undefined>(undefined);

  const range: StatementRange | undefined =
    period === 'custom'
      ? { from: customFrom, to: customTo }
      : periodToRange(period);

  const reset = useCallback(() => {
    setPeriod('all');
    setCustomFrom(undefined);
    setCustomTo(undefined);
  }, []);

  return {
    period,
    customFrom,
    customTo,
    range,
    setPeriod,
    setCustomFrom,
    setCustomTo,
    reset,
  };
}
