import { MemberMembershipScreen } from '@/domains/memberPortal';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberMembershipRoute() {
  return (
    <MemberApprovalGate>
      <MemberMembershipScreen />
    </MemberApprovalGate>
  );
}
