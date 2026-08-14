import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Attendance, AttendanceReport, AttendanceStats } from '../domain';
import type {
  AttendanceFilters,
  ReportRange,
} from '../application/AttendanceRepository';
import { AttendanceService } from '../application/AttendanceService';
import { AttendanceApiRepository } from '../infrastructure/AttendanceApiRepository';

import { attendanceKeys } from './attendanceKeys';

const repository = new AttendanceApiRepository();
const attendanceService = new AttendanceService(repository);

/**
 * Paginated attendance list.
 */
export function useAttendance(filters?: AttendanceFilters) {
  const query = useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => attendanceService.getAttendance(filters),
  });

  const attendance = query.data?.attendance ?? [];
  const pagination = query.data?.pagination;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { attendance, pagination, loading, error, refresh };
}

/**
 * Aggregate attendance statistics for the dashboard.
 */
export function useAttendanceStats() {
  const query = useQuery({
    queryKey: attendanceKeys.stats,
    queryFn: () => attendanceService.getAttendanceStats(),
  });

  const stats = query.data;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { stats, loading, error, refresh };
}

/**
 * Attendance analytics report for the reports page.
 */
export function useAttendanceReport(range?: ReportRange) {
  const query = useQuery({
    queryKey: attendanceKeys.reports(range),
    queryFn: () => attendanceService.getAttendanceReport(range),
  });

  const report = query.data;
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { report, loading, error, refresh };
}

export type { Attendance, AttendanceReport, AttendanceStats };