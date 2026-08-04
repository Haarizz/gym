import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PendingBillsScreen } from '@/domains/billing/presentation/screens/PendingBillsScreen';

/**
 * Pending Bills route.
 * Reads :id (member DB ID) and optional memberName.
 * Passes selected bill IDs to the Payment Settlement route.
 */
export default function PendingBillsRoute() {
  const router = useRouter();
  const { id, memberName } = useLocalSearchParams<{
    id: string;
    memberName?: string;
  }>();

  const memberId = id ? Number(id) : NaN;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleProceedToPayment = useCallback(
    (mId: number, selectedBillIds: string[]) => {
      router.push({
        pathname: `/(admin)/billing/members/${mId}/pay` as any,
        params: {
          memberName: memberName ?? '',
          billIds: JSON.stringify(selectedBillIds),
        },
      });
    },
    [router, memberName],
  );

  if (!memberId || Number.isNaN(memberId)) return null;

  return (
    <PendingBillsScreen
      memberId={memberId}
      memberName={memberName}
      onBack={handleBack}
      onProceedToPayment={handleProceedToPayment}
    />
  );
}
