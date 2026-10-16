import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';
import type en from '@/core/i18n/locales/en';

export type TabIcon = keyof typeof Feather.glyphMap;

export type TabTitleKey = `tabs.${keyof typeof en.tabs}`;

export interface TabConfig {
  name: string;
  /** English fallback; the tab bar shows `titleKey` translated. */
  title: string;
  titleKey: TabTitleKey;
  icon: TabIcon;
}

export interface HeaderConfig {
  title: string;
  subtitle: string;
  headerColors: string[];
  activeColor: string;
}

export const ADMIN_TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', titleKey: 'tabs.dashboard', icon: 'home' },
  { name: 'staff', title: 'Staff', titleKey: 'tabs.staff', icon: 'users' },
  { name: 'deals', title: 'Deals', titleKey: 'tabs.deals', icon: 'tag' },
  { name: 'analytics', title: 'Analytics', titleKey: 'tabs.analytics', icon: 'bar-chart-2' },
];

export const MEMBER_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', titleKey: 'tabs.home', icon: 'home' },
  { name: 'bookings', title: 'Bookings', titleKey: 'tabs.bookings', icon: 'calendar' },
  { name: 'community', title: 'Community', titleKey: 'tabs.community', icon: 'users' },
  { name: 'centers', title: 'Centers', titleKey: 'tabs.centers', icon: 'map-pin' },
  { name: 'membership', title: 'Subscription', titleKey: 'tabs.subscription', icon: 'credit-card' },
];

export const TRAINER_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', titleKey: 'tabs.home', icon: 'home' },
  { name: 'schedule', title: 'Schedule', titleKey: 'tabs.schedule', icon: 'calendar' },
  { name: 'community', title: 'Community', titleKey: 'tabs.community', icon: 'users' },
  { name: 'performance', title: 'Performance', titleKey: 'tabs.performance', icon: 'trending-up' },
  { name: 'ledger', title: 'Ledger', titleKey: 'tabs.ledger', icon: 'book-open' },
  { name: 'messaging', title: 'Messages', titleKey: 'tabs.messages', icon: 'message-square' },
];

export const STAFF_TABS: TabConfig[] = [
  { name: 'index', title: 'Home', titleKey: 'tabs.home', icon: 'home' },
  { name: 'performance', title: 'Performance', titleKey: 'tabs.performance', icon: 'trending-up' },
  { name: 'community', title: 'Community', titleKey: 'tabs.community', icon: 'users' },
  { name: 'schedule', title: 'Schedule', titleKey: 'tabs.schedule', icon: 'calendar' },
  { name: 'ledger', title: 'Ledger', titleKey: 'tabs.ledger', icon: 'book-open' },
  { name: 'messaging', title: 'Messages', titleKey: 'tabs.messages', icon: 'message-square' },
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
