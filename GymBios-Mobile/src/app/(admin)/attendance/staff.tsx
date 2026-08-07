import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { StaffAttendanceScreen } from '@/domains/attendance/presentation/screens/StaffAttendanceScreen';

/**
 * Staff & Trainers Attendance route.
 */
export default function StaffAttendanceRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return <StaffAttendanceScreen onBack={handleBack} />;
}
