import { useMemo } from 'react';
import { useTodayAttendance } from '../../hooks/useCheckIn';

export function useRecentCheckIns() {
  const { data, isLoading, error, refetch, isRefetching } = useTodayAttendance();

  const recentMembers = useMemo(() => {
    if (!data) return [];
    // Filter out walk-ins if we only want members, or return all
    // Based on the web UI, "Recent Check-Ins" on the Members tab shows member activity
    return data.filter(record => record.type !== 'Walk-In' && record.memberName);
  }, [data]);

  const recentVisitors = useMemo(() => {
    if (!data) return [];
    return data.filter(record => record.type === 'Walk-In' || record.walkInName);
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return { total: 0, active: 0, walkIns: 0 };
    const total = data.length;
    // @ts-ignore - Handle both API response formats (raw snake_case and mapped camelCase)
    const active = data.filter(r => r.status === 'In Gym' || r.status === 'active' || r.checkOutTime === null || r.check_out_time === null).length;
    const walkIns = data.filter(r => r.type === 'Walk-In' || r.walkInName).length;
    return { total, active, walkIns };
  }, [data]);

  return {
    recentMembers,
    recentVisitors,
    summary,
    isLoading,
    error,
    refetch,
    isRefetching,
  };
}
