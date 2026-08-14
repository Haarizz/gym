import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { BillingOverviewScreen } from '@/domains/billing/presentation/screens/BillingOverviewScreen';

/**
 * Billing Overview route — the entry point of the Billing module hub.
 * Delegates all navigation decisions to the screen via callbacks.
 */
export default function BillingOverviewRoute() {
  const router = useRouter();

  const handleNavigateToReceipts = useCallback(() => {
    router.push(`/(admin)/billing/receipts` as any);
  }, [router]);

  const handleNavigateToReceipt = useCallback(
    (receiptId: string) => {
      router.push(`/(admin)/billing/receipts/${receiptId}` as any);
    },
    [router],
  );

  const handleNavigateToDues = useCallback(() => {
    router.push(`/(admin)/billing/dues` as any);
  }, [router]);

  const handleNavigateToMemberStatements = useCallback(() => {
    router.push(`/(admin)/billing/statements` as any);
  }, [router]);

  const handleNavigateToMemberStatement = useCallback(
    (memberId: number, memberName?: string) => {
      router.push({
        pathname: `/(admin)/billing/members/${memberId}/statement` as any,
        params: { memberName: memberName ?? '' },
      });
    },
    [router],
  );

  const handleNavigateToCollectionReports = useCallback(() => {
    router.push(`/(admin)/billing/reports` as any);
  }, [router]);

  const handleNavigateToCreateReceipt = useCallback(() => {
    router.push(`/(admin)/billing/create-receipt` as any);
  }, [router]);

  return (
    <BillingOverviewScreen
      onNavigateToReceipts={handleNavigateToReceipts}
      onNavigateToReceipt={handleNavigateToReceipt}
      onNavigateToDues={handleNavigateToDues}
      onNavigateToMemberStatements={handleNavigateToMemberStatements}
      onNavigateToMemberStatement={handleNavigateToMemberStatement}
      onNavigateToCollectionReports={handleNavigateToCollectionReports}
      onNavigateToCreateReceipt={handleNavigateToCreateReceipt}
    />
  );
}
