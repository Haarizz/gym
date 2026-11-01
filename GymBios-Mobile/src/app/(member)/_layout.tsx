import {
  MEMBER_HEADER,
  MEMBER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

import { BranchProvider } from '@/shared/providers/BranchProvider';
import { MemberPushNotifications } from '@/domains/notifications';
import { GymRatingHost } from '@/domains/memberPortal/gymRating';
import { usePaymentApprovalToast } from '@/domains/discovery/hooks/usePaymentApprovalToast';
import { PendingLinkRequestsSheet } from '@/domains/account';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { ChooseGymScreen } from '@/domains/gymSwitcher';

export default function MemberLayout() {
  usePaymentApprovalToast();
  // Signed in on a new device with memberships at several gyms: ask which one to open
  // before anything gym-scoped loads.
  const gymChoicePending = useAuthStore((s) => s.gymChoicePending);

  if (gymChoicePending) {
    return <ChooseGymScreen />;
  }

  return (
    <BranchProvider>
      <MemberPushNotifications />
      <GymRatingHost />
      <PendingLinkRequestsSheet />
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
