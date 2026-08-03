import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { MemberCreateEditScreen } from '@/domains/members/presentation/screens/MemberCreateEditScreen';

export default function CreateMemberRoute() {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  return <MemberCreateEditScreen mode="create" onSuccess={handleSuccess} />;
}