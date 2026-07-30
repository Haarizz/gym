import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { AdminStaffScreen } from '@/domains/hr/presentation/screens/AdminStaffScreen';
import type { Staff } from '@/domains/hr/domain/Staff';

export default function StaffListRoute() {
  const router = useRouter();

  const handleNavigateToDetail = useCallback(
    (staff: Staff) => {
      router.push(`/(admin)/staff/${staff.id}` as any);
    },
    [router],
  );

  const handleNavigateToCreate = useCallback(() => {
    router.push('/(admin)/staff/create' as any);
  }, [router]);

  return (
    <AdminStaffScreen
      onNavigateToDetail={handleNavigateToDetail}
      onNavigateToCreate={handleNavigateToCreate}
    />
  );
}