import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { CollectionReportsScreen } from '@/domains/billing/presentation/screens/CollectionReportsScreen';

/**
 * Collection Reports Route — analytics summary, breakdowns, exports.
 */
export default function CollectionReportsRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return <CollectionReportsScreen onBack={handleBack} />;
}
