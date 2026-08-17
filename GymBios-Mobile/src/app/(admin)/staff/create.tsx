import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { StaffWizardScreen } from '@/domains/hr/presentation/screens/StaffWizardScreen';

export default function CreateStaffRoute() {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    router.replace('/(admin)/staff');
  }, [router]);

  return <StaffWizardScreen mode="create" onSuccess={handleSuccess} />;
}