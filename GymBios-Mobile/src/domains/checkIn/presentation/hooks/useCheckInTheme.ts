import { useSegments } from 'expo-router';
import { BrandColors } from '@/core/theme';
import { TRAINER_HEADER } from '@/domains/auth/presentation/navigation/tabConfigs';

export interface CheckInTheme {
  headerColors: [string, string];
  /** Check-in buttons, highlighted stat card, accent text. */
  accent: string;
  /** Selected filter chip. */
  accentDark: string;
  /** Tinted icon backgrounds. */
  accentSoft: string;
  avatar: string;
}

const STAFF_THEME: CheckInTheme = {
  headerColors: ['#155c4c', '#0f4a3d'],
  accent: '#1c6e5a',
  accentDark: '#155c4c',
  accentSoft: '#e7f3ef',
  avatar: BrandColors.teal,
};

const TRAINER_THEME: CheckInTheme = {
  headerColors: TRAINER_HEADER.headerColors as [string, string],
  accent: '#d97706',
  accentDark: '#b45309',
  accentSoft: '#fef3e2',
  avatar: BrandColors.trainerAmber,
};

/**
 * The staff check-in screens are shared with the trainer app; this picks the
 * accent palette for whichever role group is showing them.
 */
export function useCheckInTheme(): CheckInTheme {
  const roleGroup = useSegments()[0];
  return roleGroup === '(trainer)' ? TRAINER_THEME : STAFF_THEME;
}
