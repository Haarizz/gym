import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { MemberDetailsScreen } from '@/domains/members/presentation/screens/MemberDetailsScreen';
import type { Member } from '@/domains/members/domain/Member';

export default function MemberDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const memberId = id ? Number(id) : NaN;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleEdit = useCallback(
    (member: Member) => {
      router.push(`/(admin)/members/edit/${member.id}` as any);
    },
    [router],
  );

  const handleSelectFamilyMember = useCallback(
    (memberId: number) => {
      router.push(`/(admin)/members/${memberId}` as any);
    },
    [router],
  );

  const handleDeleted = useCallback(() => {
    router.back();
  }, [router]);

  if (Number.isNaN(memberId)) return null;

  return (
    <MemberDetailsScreen
      memberId={memberId}
      onBack={handleBack}
      onEdit={handleEdit}
      onSelectFamilyMember={handleSelectFamilyMember}
      onDeleted={handleDeleted}
    />
  );
}