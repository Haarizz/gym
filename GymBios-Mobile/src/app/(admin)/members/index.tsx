import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { MembersListScreen } from '@/domains/members/presentation/screens/MembersListScreen';
import type { Member } from '@/domains/members/domain/Member';

export default function MembersListRoute() {
  const router = useRouter();

  const handleNavigateToDetail = useCallback(
    (member: Member) => {
      router.push(`/(admin)/members/${member.id}` as any);
    },
    [router],
  );

  const handleNavigateToCreate = useCallback(() => {
    router.push('/(admin)/members/create' as any);
  }, [router]);

  return (
    <MembersListScreen
      onNavigateToDetail={handleNavigateToDetail}
      onNavigateToCreate={handleNavigateToCreate}
    />
  );
}