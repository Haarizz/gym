import { MemberOffersScreen } from '@/domains/dashboard';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberOffersRoute() {
  return (
    <MemberApprovalGate>
      <MemberOffersScreen />
    </MemberApprovalGate>
  );
}
