import { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { MemberCreateEditScreen } from '@/domains/members/presentation/screens/MemberCreateEditScreen';
import type { MemberPrefill } from '@/domains/members/hooks/useMemberWizard';

export default function CreateMemberRoute() {
  const router = useRouter();
  // Set when arriving from a converted lead (see registerLeadAsMember).
  const params = useLocalSearchParams<{
    leadId?: string;
    name?: string;
    email?: string;
    phone?: string;
    assignedStaff?: string;
  }>();

  const prefill = useMemo<MemberPrefill | undefined>(() => {
    const leadId = Number(params.leadId);
    if (!leadId) return undefined;
    return {
      leadId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      assignedStaff: params.assignedStaff,
    };
  }, [params.leadId, params.name, params.email, params.phone, params.assignedStaff]);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  return <MemberCreateEditScreen mode="create" prefill={prefill} onSuccess={handleSuccess} />;
}
