import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { MemberStatementScreen } from '@/domains/billing/presentation/screens/MemberStatementScreen';

/**
 * Member Statement route.
 * Reads :id (member DB ID) and optional memberName param.
 */
export default function MemberStatementRoute() {
  const router = useRouter();
  const { id, memberName } = useLocalSearchParams<{
    id: string;
    memberName?: string;
  }>();

  const memberId = id ? Number(id) : NaN;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleNavigateToPendingBills = useCallback(
    (mId: number, mName?: string) => {
      router.push({
        pathname: `/(admin)/billing/members/${mId}/pending-bills` as any,
        params: { memberName: mName ?? '' },
      });
    },
    [router],
  );

  if (!memberId || Number.isNaN(memberId)) return null;

  return (
    <MemberStatementScreen
      memberId={memberId}
      memberName={memberName}
      onBack={handleBack}
      onNavigateToPendingBills={handleNavigateToPendingBills}
    />
  );
}
