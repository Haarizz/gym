import { useCallback, useMemo, useState } from 'react';

import type { AttendanceFilters } from '../../application/AttendanceRepository';
import { toISODate } from '../components/shared/attendanceUtils';

/**
 * Date period options for the attendance list filter.
 * Mirrors the web frontend's `selectedDate` values.
 */
export type DatePeriod = 'today' | 'yesterday' | 'this-week';

export interface UseAttendanceFiltersReturn {
  /** Currently selected date period. */
  datePeriod: DatePeriod;
  /** Search term typed by the user. */
  search: string;
  /** Filters ready to pass to the server-state hook. */
  apiFilters: AttendanceFilters;
  /** Set the date period. */
  setDatePeriod: (period: DatePeriod) => void;
  /** Set the search term. */
  setSearch: (text: string) => void;
  /** Clear all filters back to defaults. */
  clearFilters: () => void;
}

/**
 * Presentation-only hook for the attendance list screen.
 *
 * Manages ephemeral UI state — date period selection and search text —
 * and derives the API filters that the server-state `useAttendance` hook
 * consumes.  Never touches the network directly.
 */
export function useAttendanceFilters(): UseAttendanceFiltersReturn {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('today');
  const [search, setSearch] = useState('');

  const clearFilters = useCallback(() => {
    setDatePeriod('today');
    setSearch('');
  }, []);

  const apiFilters: AttendanceFilters = useMemo(() => {
    const today = new Date();

    let date: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (datePeriod === 'today') {
      date = toISODate(today);
    } else if (datePeriod === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      date = toISODate(yesterday);
    } else if (datePeriod === 'this-week') {
      const day = today.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day; // days to Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      startDate = toISODate(monday);
      endDate = toISODate(today);
    }

    return {
      date,
      startDate,
      endDate,
      search: search.trim() || undefined,
    };
  }, [datePeriod, search]);


  return {
    datePeriod,
    search,
    apiFilters,
    setDatePeriod,
    setSearch,
    clearFilters,
  };
}
