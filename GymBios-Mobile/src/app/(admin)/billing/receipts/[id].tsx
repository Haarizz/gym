import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ReceiptDetailsScreen } from '@/domains/billing/presentation/screens/ReceiptDetailsScreen';

/**
 * Receipt Details route.
 * Reads :id from the URL segment, parses it to a number, and passes it to the screen.
 */
export default function ReceiptDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const receiptId = id ? Number(id) : NaN;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!receiptId || Number.isNaN(receiptId)) return null;

  return (
    <ReceiptDetailsScreen
      receiptId={receiptId}
      onBack={handleBack}
    />
  );
}
