import {
  MEMBER_HEADER,
  MEMBER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

import { BranchProvider } from '@/shared/providers/BranchProvider';

export default function MemberLayout() {
  return (
    <BranchProvider>
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
