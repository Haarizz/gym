import { MemberBookingsScreen } from '@/domains/memberPortal';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberBookingsRoute() {
  return (
    <MemberApprovalGate>
      <MemberBookingsScreen />
    </MemberApprovalGate>
  );
}
