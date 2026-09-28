import { MemberTrainerScreen } from '@/domains/memberPortal';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberTrainerRoute() {
  return (
    <MemberApprovalGate>
      <MemberTrainerScreen />
    </MemberApprovalGate>
  );
}
