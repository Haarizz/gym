import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { TodayAttendanceScreen } from '@/domains/attendance/presentation/screens/TodayAttendanceScreen';

/**
 * Today's Attendance route.
 */
export default function TodayAttendanceRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return <TodayAttendanceScreen onBack={handleBack} />;
}
