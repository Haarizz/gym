import {
  MEMBER_HEADER,
  MEMBER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

import { BranchProvider } from '@/shared/providers/BranchProvider';
import { MemberPushNotifications } from '@/domains/notifications';
import { usePaymentApprovalToast } from '@/domains/discovery/hooks/usePaymentApprovalToast';

export default function MemberLayout() {
  usePaymentApprovalToast();

  return (
    <BranchProvider>
      <MemberPushNotifications />
      <RoleTabsLayout
        title={MEMBER_HEADER.title}
        subtitle={MEMBER_HEADER.subtitle}
        headerColors={MEMBER_HEADER.headerColors}
        activeColor={MEMBER_HEADER.activeColor}
        tabs={MEMBER_TABS}
      />
    </BranchProvider>
  );
}
