import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PaymentSettlementScreen } from '@/domains/billing/presentation/screens/PaymentSettlementScreen';

/**
 * Payment Settlement route.
 *
 * Reads :id (member DB ID), memberName, and billIds (JSON-serialised string[]).
 * On success navigates to the new receipt details, replacing the entire settlement
 * stack so the user cannot back into the payment flow after completion.
 */
export default function PaymentSettlementRoute() {
  const router = useRouter();
  const { id, memberName, billIds } = useLocalSearchParams<{
    id: string;
    memberName?: string;
    billIds?: string;
  }>();

  const memberId = id ? Number(id) : NaN;

  let selectedBillIds: string[] = [];
  try {
    if (billIds) {
      selectedBillIds = JSON.parse(billIds);
    }
  } catch {
    selectedBillIds = [];
  }

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccess = useCallback(
    (receiptId: string) => {
      // Replace the current stack entry so the user lands on the receipt
      // and pressing back goes to Overview, not the payment form.
      router.replace(`/(admin)/billing/receipts/${receiptId}` as any);
    },
    [router],
  );

  if (!memberId || Number.isNaN(memberId)) return null;

  return (
    <PaymentSettlementScreen
      memberId={memberId}
      memberName={memberName}
      selectedBillIds={selectedBillIds}
      onBack={handleBack}
      onSuccess={handleSuccess}
    />
  );
}
