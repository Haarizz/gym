import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { MemberInfo } from '../../domain/MemberDashboardData';

interface MemberWelcomeCardProps {
  memberInfo: MemberInfo;
}

export function MemberWelcomeCard({ memberInfo }: MemberWelcomeCardProps) {
  const firstName = memberInfo.name ? memberInfo.name.split(' ')[0] : 'Member';

  return (
    <GlassSurface radius={18} style={styles.card}>
      <Text style={styles.title}>Welcome back, {firstName}! 👋</Text>
      <Text style={styles.subtitle}>Ready to crush your goals today?</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TypographyScale.small,
    fontWeight: '500',
    color: BrandColors.textSecondary,
  },
});
