import { useAuthStore } from '@/domains/auth';
import { BrandColors } from '@/core/theme';
import {
  ADMIN_HEADER,
  MEMBER_HEADER,
  TRAINER_HEADER,
  STAFF_HEADER,
} from '@/domains/auth/presentation/navigation/tabConfigs';

export function useCommunityTheme() {
  const appRole = useAuthStore((s) => s.appRole);

  switch (appRole) {
    case 'member':
      return {
        primaryColor: MEMBER_HEADER.activeColor,
        headerColors: MEMBER_HEADER.headerColors,
        navColors: MEMBER_HEADER.navColors,
      };
    case 'trainer':
      return {
        primaryColor: TRAINER_HEADER.activeColor,
        headerColors: TRAINER_HEADER.headerColors,
        navColors: TRAINER_HEADER.navColors,
      };
    case 'staff':
      return {
        primaryColor: STAFF_HEADER.activeColor,
        headerColors: STAFF_HEADER.headerColors,
        navColors: STAFF_HEADER.navColors,
      };
    case 'admin':
    default:
      return {
        primaryColor: ADMIN_HEADER.activeColor,
        headerColors: ADMIN_HEADER.headerColors,
        navColors: ADMIN_HEADER.navColors,
      };
  }
}
