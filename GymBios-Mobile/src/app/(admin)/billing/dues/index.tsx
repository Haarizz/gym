import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { DuesScreen } from '@/domains/billing/presentation/screens/DuesScreen';

/**
 * Outstanding Dues Route — displays member dues list and quick actions.
 */
export default function DuesRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
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

  const handleCollectPayment = useCallback(() => {
    router.push(`/(admin)/billing/create-receipt` as any);
  }, [router]);

  return (
    <DuesScreen
      onBack={handleBack}
      onNavigateToMemberStatement={handleNavigateToMemberStatement}
      onCollectPayment={handleCollectPayment}
    />
  );
}
