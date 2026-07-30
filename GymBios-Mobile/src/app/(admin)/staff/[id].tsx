import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { StaffDetailScreen } from '@/domains/hr/presentation/screens/StaffDetailScreen';

export default function StaffDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleDeleted = useCallback(() => {
    router.back();
  }, [router]);

  const handleUpdated = useCallback(() => {
    // Staff data is already refreshed via the hook
  }, []);

  if (!id) return null;

  return (
    <StaffDetailScreen
      staffId={id}
      onBack={handleBack}
      onDeleted={handleDeleted}
      onUpdated={handleUpdated}
    />
  );
}