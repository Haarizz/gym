import { StaffProfileScreen } from '@/domains/memberPortal';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function StaffProfileRoute() {
  return (
    <MemberApprovalGate>
      <StaffProfileScreen />
    </MemberApprovalGate>
  );
}
