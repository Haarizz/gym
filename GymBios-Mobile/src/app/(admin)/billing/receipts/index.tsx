import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { ReceiptsScreen } from '@/domains/billing/presentation/screens/ReceiptsScreen';

/**
 * Receipt Management Route — lists all receipts with search and filters.
 */
export default function ReceiptsRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleNavigateToReceipt = useCallback(
    (receiptId: string) => {
      router.push(`/(admin)/billing/receipts/${receiptId}` as any);
    },
    [router],
  );

  return <ReceiptsScreen onBack={handleBack} onNavigateToReceipt={handleNavigateToReceipt} />;
}
