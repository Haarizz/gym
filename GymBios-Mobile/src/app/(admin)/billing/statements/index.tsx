import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { MemberStatementsScreen } from '@/domains/billing/presentation/screens/MemberStatementsScreen';

/**
 * Member Statements Route — search member and launch statement timeline.
 */
export default function MemberStatementsRoute() {
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

  return (
    <MemberStatementsScreen
      onBack={handleBack}
      onNavigateToMemberStatement={handleNavigateToMemberStatement}
    />
  );
}
