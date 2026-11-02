import {
  STAFF_HEADER,
  STAFF_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

import { BranchProvider } from '@/shared/providers/BranchProvider';
import { StaffPushNotifications } from '@/domains/notifications';

export default function StaffLayout() {
  return (
    <BranchProvider>
      <StaffPushNotifications />
      <RoleTabsLayout
        title={STAFF_HEADER.title}
        subtitle={STAFF_HEADER.subtitle}
        headerColors={STAFF_HEADER.headerColors}
        activeColor={STAFF_HEADER.activeColor}
        navColors={STAFF_HEADER.navColors}
        tabs={STAFF_TABS}
      />
    </BranchProvider>
  );
}
