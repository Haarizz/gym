import {
  MEMBER_HEADER,
  MEMBER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

export default function MemberLayout() {
  return (
    <RoleTabsLayout
      title={MEMBER_HEADER.title}
      subtitle={MEMBER_HEADER.subtitle}
      headerColors={MEMBER_HEADER.headerColors}
      activeColor={MEMBER_HEADER.activeColor}
      tabs={MEMBER_TABS}
    />
  );
}
