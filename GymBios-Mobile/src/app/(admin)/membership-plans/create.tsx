import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { CreateMembershipPlanScreen } from '@/domains/membershipPlans/presentation/screens/CreateMembershipPlanScreen';

export default function CreateMembershipPlanRoute() {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <CreateMembershipPlanScreen
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}