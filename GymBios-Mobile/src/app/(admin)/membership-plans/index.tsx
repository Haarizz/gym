import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { MembershipPlansScreen } from '@/domains/membershipPlans/presentation/screens/MembershipPlansScreen';
import type { MembershipPlan } from '@/domains/membershipPlans/domain/MembershipPlan';

export default function MembershipPlansListRoute() {
  const router = useRouter();

  const handleNavigateToCreate = useCallback(() => {
    router.push('/(admin)/membership-plans/create' as any);
  }, [router]);

  const handleNavigateToEdit = useCallback(
    (plan: MembershipPlan) => {
      router.push(`/(admin)/membership-plans/edit/${plan.id}` as any);
    },
    [router],
  );

  return (
    <MembershipPlansScreen
      onNavigateToCreate={handleNavigateToCreate}
      onNavigateToEdit={handleNavigateToEdit}
    />
  );
}