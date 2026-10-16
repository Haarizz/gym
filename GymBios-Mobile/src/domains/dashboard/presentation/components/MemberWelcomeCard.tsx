import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { MemberInfo } from '../../domain/MemberDashboardData';

interface MemberWelcomeCardProps {
  memberInfo: MemberInfo;
}

export function MemberWelcomeCard({ memberInfo }: MemberWelcomeCardProps) {
  const { t } = useTranslation();
  const firstName = memberInfo.name?.trim().split(/\s+/)[0] || t('memberHome.memberFallback');
  // No check-ins yet means this is the member's first time here.
  const isNewMember = memberInfo.totalVisits === 0;

  return (
    <GlassSurface radius={18} style={styles.card}>
      <Text style={styles.title}>
        {t(isNewMember ? 'memberHome.welcomeNew' : 'memberHome.welcomeBack', { name: firstName })}
      </Text>
      <Text style={styles.subtitle}>
        {t(isNewMember ? 'memberHome.welcomeNewSub' : 'memberHome.welcomeBackSub')}
      </Text>
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
