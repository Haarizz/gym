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
  danger: '#d4183d',
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

export const MaxContentWidth = 800;

// Liquid-glass panel recipe: translucent white fill + soft white border +
// navy-tinted shadow. Used by GlassSurface/GlassBlob and the 'glass' Input
// variant. Colour behind these fills (a gradient or a GlassBlob) is what
// makes them read as "glass" rather than flat grey — see gymbios-liquid-glass.html.
export const Glass = {
  fill: 'rgba(255,255,255,0.45)',
  fillStrong: 'rgba(255,255,255,0.68)',
  border: 'rgba(255,255,255,0.65)',
  highlight: 'rgba(255,255,255,0.5)',
  shadowColor: 'rgba(30,42,58,0.16)',
} as const;

// A "solid" hero card in the reference (active plan, check-in) is still
// ~72-88% opaque, not fully opaque — enough that the GlassBlob behind it
// still bleeds through at the edges so it keeps reading as glass rather
// than a flat opaque card. Use this instead of a bare hex backgroundColor
// on any hero/CTA card that sits over a GlassBlob-backed screen.
export function heroTint(hex: string, alpha = 0.88): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const TypographyScale = {
  caption: 10,
  small: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  display: 32,
} as const;
