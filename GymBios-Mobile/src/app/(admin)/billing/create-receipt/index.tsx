import React from 'react';
import { useRouter } from 'expo-router';
import { CreateReceiptScreen } from '@/domains/billing/presentation/screens';

export default function CreateReceiptRoute() {
  const router = useRouter();

  return (
    <CreateReceiptScreen
      onBack={() => router.back()}
      onReceiptCreated={(receiptId) => {
        router.replace(`/(admin)/billing/receipts/${receiptId}`);
      }}
      onViewMemberProfile={(memberId) => {
        router.push(`/(admin)/members/${memberId}`);
      }}
    />
  );
}
