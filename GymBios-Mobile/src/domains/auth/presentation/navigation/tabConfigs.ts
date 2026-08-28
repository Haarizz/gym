import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';

export type TabIcon = keyof typeof Feather.glyphMap;

export interface TabConfig {
  name: string;
  title: string;
  icon: TabIcon;
}

export interface HeaderConfig {
  title: string;
  subtitle: string;
  headerColors: string[];
  activeColor: string;
}

export const ADMIN_TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid' },
  { name: 'staff', title: 'Staff', icon: 'users' },
  { name: 'deals', title: 'Deals', icon: 'tag' },
  { name: 'analytics', title: 'Analytics', icon: 'bar-chart-2' },
];

export const MEMBER_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'bookings', title: 'Bookings', icon: 'calendar' },
  { name: 'community', title: 'Community', icon: 'users' },
  { name: 'centers', title: 'Centers', icon: 'map-pin' },
  { name: 'membership', title: 'Membership', icon: 'credit-card' },
];

export const TRAINER_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'schedule', title: 'Schedule', icon: 'calendar' },
  { name: 'community', title: 'Community', icon: 'users' },
  { name: 'performance', title: 'Performance', icon: 'trending-up' },
  { name: 'ledger', title: 'Ledger', icon: 'book-open' },
  { name: 'messaging', title: 'Messages', icon: 'message-square' },
];

export const STAFF_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'performance', title: 'Performance', icon: 'trending-up' },
  { name: 'community', title: 'Community', icon: 'users' },
  { name: 'schedule', title: 'Schedule', icon: 'calendar' },
  { name: 'ledger', title: 'Ledger', icon: 'book-open' },
  { name: 'messaging', title: 'Messages', icon: 'message-square' },
];

export const ADMIN_HEADER: HeaderConfig = {
  title: 'Admin',
  subtitle: 'Command Center',
  headerColors: [BrandColors.teal, BrandColors.teal],
  activeColor: BrandColors.teal,
};

export const MEMBER_HEADER: HeaderConfig = {
  title: 'Member Portal',
  subtitle: 'Your Fitness Journey',
  headerColors: [BrandColors.memberGold, BrandColors.trainerAmber],
  activeColor: BrandColors.memberGold,
};

export const TRAINER_HEADER: HeaderConfig = {
  title: 'Trainer Portal',
  subtitle: 'Coach Portal',
  headerColors: [BrandColors.trainerAmber, '#ea580c'],
  activeColor: BrandColors.trainerAmber,
};

export const STAFF_HEADER: HeaderConfig = {
  title: 'Staff Portal',
  subtitle: 'Front Desk',
  headerColors: [BrandColors.teal, BrandColors.tealDark],
  activeColor: BrandColors.teal,
};
