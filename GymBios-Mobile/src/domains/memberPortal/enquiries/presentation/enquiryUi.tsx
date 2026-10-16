import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { formatDate } from '@/core/i18n';
import { Radius } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { EnquiryCategory, EnquiryStatus } from '../enquiriesApi';

/** Warm palette from the enquiry screens' design. */
export const EnquiryColors = {
  ink: '#2A2418',
  muted: '#6B6250',
  line: 'rgba(42,36,24,0.08)',
  amber: '#F6B73C',
  amberLight: '#F9C866',
  amberSoft: '#FDF0CF',
  amberInk: '#5A3E00',
  teal: '#3F6E62',
  tealLight: '#4A7D70',
  tealSoft: '#DDEBE6',
  blueSoft: '#E1EAFB',
  blueInk: '#1F3F80',
  greySoft: '#ECE9E2',
  background: '#F5F4F0',
} as const;

type FeatherName = keyof typeof Feather.glyphMap;

export const CATEGORY_STYLES: Record<EnquiryCategory, { icon: FeatherName; bg: string; fg: string }> = {
  GENERAL: { icon: 'help-circle', bg: '#ECE9E2', fg: '#5d5646' },
  MEMBERSHIP: { icon: 'credit-card', bg: '#FDF0CF', fg: '#8A5A00' },
  BILLING: { icon: 'dollar-sign', bg: '#E1EAFB', fg: '#2F62C9' },
  FACILITIES: { icon: 'home', bg: '#FCE4DA', fg: '#B4532B' },
  TRAINER: { icon: 'user', bg: '#DDEBE6', fg: '#2E5E52' },
  CLASSES: { icon: 'calendar', bg: '#EDE6FE', fg: '#6A47E8' },
  FEEDBACK: { icon: 'message-square', bg: '#FDE7EF', fg: '#B23A68' },
  OTHER: { icon: 'more-horizontal', bg: '#ECE9E2', fg: '#5d5646' },
};

const STATUS_STYLES: Record<EnquiryStatus, { bg: string; fg: string }> = {
  OPEN: { bg: EnquiryColors.amberSoft, fg: '#7A5200' },
  REPLIED: { bg: EnquiryColors.tealSoft, fg: '#24564A' },
  CLOSED: { bg: EnquiryColors.greySoft, fg: '#5d5646' },
};

export function categoryStyle(category: string) {
  return CATEGORY_STYLES[category as EnquiryCategory] ?? CATEGORY_STYLES.OTHER;
}

export function CategoryIcon({ category, size = 36 }: { category: string; size?: number }) {
  const s = categoryStyle(category);
  return (
    <View style={[styles.catIcon, { width: size, height: size, backgroundColor: s.bg }]}>
      <Feather name={s.icon} size={Math.round(size / 2)} color={s.fg} />
    </View>
  );
}

export function StatusPill({ status }: { status: EnquiryStatus }) {
  const { t } = useTranslation();
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Typography style={[styles.pillText, { color: s.fg }]}>{t(`enquiries.status.${status}`)}</Typography>
    </View>
  );
}

export function formatEnquiryDate(iso: string | null | undefined, pattern = 'PP'): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : formatDate(d, pattern);
}

const styles = StyleSheet.create({
  catIcon: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
