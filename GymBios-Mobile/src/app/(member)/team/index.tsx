import { MemberTeamScreen } from '@/domains/memberPortal';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberTeamRoute() {
  return (
    <MemberApprovalGate>
      <MemberTeamScreen />
    </MemberApprovalGate>
  );
}
