import { MemberDashboardScreen } from '@/domains/dashboard';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberHomeRoute() {
  return (
    <MemberApprovalGate>
      <MemberDashboardScreen />
    </MemberApprovalGate>
  );
}
