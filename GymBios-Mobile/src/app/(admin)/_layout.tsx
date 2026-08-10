import {
  ADMIN_HEADER,
  ADMIN_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <RoleTabsLayout
      title={ADMIN_HEADER.title}
      subtitle={ADMIN_HEADER.subtitle}
      headerColors={ADMIN_HEADER.headerColors}
      activeColor={ADMIN_HEADER.activeColor}
      tabs={ADMIN_TABS}
    />
  );
}
