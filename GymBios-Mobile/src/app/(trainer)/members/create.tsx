import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { MemberCreateEditScreen } from '@/domains/members/presentation/screens/MemberCreateEditScreen';

// Same wizard admins use. There is no "Processed By" picker: the server credits the sale
// to the signed-in trainer, so it counts toward their targets.
export default function TrainerCreateMemberRoute() {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(trainer)' as any);
  }, [router]);

  return <MemberCreateEditScreen mode="create" onSuccess={handleSuccess} />;
}
