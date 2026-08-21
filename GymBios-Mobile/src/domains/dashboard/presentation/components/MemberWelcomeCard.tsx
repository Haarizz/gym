import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberInfo } from '../../domain/MemberDashboardData';

interface MemberWelcomeCardProps {
  memberInfo: MemberInfo;
}

export function MemberWelcomeCard({ memberInfo }: MemberWelcomeCardProps) {
  const firstName = memberInfo.name ? memberInfo.name.split(' ')[0] : 'Member';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.subtitle}>Ready to crush your goals today?</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
});
