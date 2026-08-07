import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { AttendanceHubScreen } from '@/domains/attendance/presentation/screens/AttendanceHubScreen';

/**
 * Attendance Hub route — the entry point of the Attendance module.
 * Delegates all navigation decisions to the screen via callbacks.
 */
export default function AttendanceHubRoute() {
  const router = useRouter();

  const handleNavigateToToday = useCallback(() => {
    router.push('/(admin)/attendance/today' as any);
  }, [router]);

  const handleNavigateToStaff = useCallback(() => {
    router.push('/(admin)/attendance/staff' as any);
  }, [router]);

  const handleNavigateToTrends = useCallback(() => {
    router.push('/(admin)/attendance/trends' as any);
  }, [router]);

  const handleNavigateToReports = useCallback(() => {
    router.push('/(admin)/attendance/reports' as any);
  }, [router]);

  return (
    <AttendanceHubScreen
      onNavigateToToday={handleNavigateToToday}
      onNavigateToStaff={handleNavigateToStaff}
      onNavigateToTrends={handleNavigateToTrends}
      onNavigateToReports={handleNavigateToReports}
    />
  );
}
