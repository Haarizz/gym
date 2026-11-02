import { ChatRouteScreen } from '@/domains/conversations';
import { MemberApprovalGate } from '@/domains/discovery/presentation/MemberApprovalGate';

export default function MemberChatRoute() {
  return (
    <MemberApprovalGate>
      <ChatRouteScreen />
    </MemberApprovalGate>
  );
}
