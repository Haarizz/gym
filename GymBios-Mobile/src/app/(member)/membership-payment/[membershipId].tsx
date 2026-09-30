import { useLocalSearchParams } from 'expo-router';

import { MembershipPaymentScreen } from '@/domains/membershipPayment';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MembershipPaymentRoute() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  return (
    <MemberApprovalGate>
      <MembershipPaymentScreen membershipId={Number(membershipId)} />
    </MemberApprovalGate>
  );
}
