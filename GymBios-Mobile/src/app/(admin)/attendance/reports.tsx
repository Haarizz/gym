import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { AttendanceReportsScreen } from '@/domains/attendance/presentation/screens/AttendanceReportsScreen';

/**
 * Attendance Reports route.
 */
export default function AttendanceReportsRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return <AttendanceReportsScreen onBack={handleBack} />;
}
