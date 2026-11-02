import {
  TRAINER_HEADER,
  TRAINER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

import { BranchProvider } from '@/shared/providers/BranchProvider';
import { StaffPushNotifications } from '@/domains/notifications';

export default function TrainerLayout() {
  return (
    <BranchProvider>
      <StaffPushNotifications />
      <RoleTabsLayout
        title={TRAINER_HEADER.title}
        subtitle={TRAINER_HEADER.subtitle}
        headerColors={TRAINER_HEADER.headerColors}
        activeColor={TRAINER_HEADER.activeColor}
        navColors={TRAINER_HEADER.navColors}
        tabs={TRAINER_TABS}
      />
    </BranchProvider>
  );
}
