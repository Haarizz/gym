import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { WeeklyTrendsScreen } from '@/domains/attendance/presentation/screens/WeeklyTrendsScreen';

/**
 * Weekly Trends route.
 */
export default function WeeklyTrendsRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return <WeeklyTrendsScreen onBack={handleBack} />;
}
