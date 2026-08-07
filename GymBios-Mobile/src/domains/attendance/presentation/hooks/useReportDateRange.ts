import { useCallback, useMemo, useState } from 'react';

import type { ReportRange } from '../../application/AttendanceRepository';
import { toISODate } from '../components/shared/attendanceUtils';

/**
 * Pre-set report period options.
 * Mirrors the web frontend's `ReportPeriodSelector` values.
 */
export type ReportPeriod = '7d' | '30d' | '90d';

export interface UseReportDateRangeReturn {
  /** Currently selected report period. */
  period: ReportPeriod;
  /** Start date string (ISO yyyy-mm-dd) for the selected period. */
  startDate: string;
  /** End date string (ISO yyyy-mm-dd) for the selected period. */
  endDate: string;
  /** Range ready to pass to the server-state `useAttendanceReport` hook. */
  apiRange: ReportRange;
  /** Set the report period. */
  setPeriod: (period: ReportPeriod) => void;
}

/**
 * Presentation-only hook for the attendance reports screen.
 *
 * Manages the selected report period and derives the start/end date
 * range that the server-state `useAttendanceReport` hook consumes.
 * Never touches the network directly.
 */
export function useReportDateRange(): UseReportDateRangeReturn {
  const [period, setPeriod] = useState<ReportPeriod>('30d');

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    return {
      startDate: toISODate(start),
      endDate: toISODate(today),
    };
  }, [period]);

  const apiRange: ReportRange = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate],
  );

  const setPeriodCallback = useCallback((p: ReportPeriod) => {
    setPeriod(p);
  }, []);

  return {
    period,
    startDate,
    endDate,
    apiRange,
    setPeriod: setPeriodCallback,
  };
}
