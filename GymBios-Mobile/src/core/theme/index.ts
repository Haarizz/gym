import '@/shared/assets/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  teal: '#327f74',
  tealDark: '#2a6b62',
  memberGold: '#F5C742',
  trainerAmber: '#F59E0B',
  textPrimary: '#1e293b',
  textSecondary: '#49587a',
  screenBackground: '#f9fafe',
  screenBackgroundAlt: '#eef7f6',
  surface: '#FFFFFF',
  neutral: {
    900: '#1e293b',
    500: '#49587a',
    200: '#eef7f6',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const Colors = {
  light: {
    text: BrandColors.textPrimary,
    background: '#ffffff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#F0F0F3',
    textSecondary: BrandColors.textSecondary,
    primary: BrandColors.teal,
    primaryText: '#ffffff',
    border: 'rgba(0, 0, 0, 0.1)',
    error: '#d4183d',
    screen: BrandColors.screenBackground,
    member: BrandColors.memberGold,
    trainer: BrandColors.trainerAmber,
    admin: BrandColors.teal,
    staff: BrandColors.tealDark,
    muted: '#ececf0',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: BrandColors.teal,
    primaryText: '#ffffff',
    border: '#2E3135',
    error: '#FF6369',
    screen: '#0f1419',
    member: BrandColors.memberGold,
    trainer: BrandColors.trainerAmber,
    admin: BrandColors.teal,
    staff: BrandColors.tealDark,
    muted: '#2E3135',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ColorScheme = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  md: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const TypographyScale = {
  caption: 10,
  small: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  display: 32,
} as const;
