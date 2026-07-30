import {
  STAFF_HEADER,
  STAFF_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

export default function StaffLayout() {
  return (
    <RoleTabsLayout
      title={STAFF_HEADER.title}
      subtitle={STAFF_HEADER.subtitle}
      headerColors={STAFF_HEADER.headerColors}
      activeColor={STAFF_HEADER.activeColor}
      tabs={STAFF_TABS}
    />
  );
}
