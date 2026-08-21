import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberQuickStatItem } from '../../domain/MemberDashboardData';

interface MemberStatsGridProps {
  stats: MemberQuickStatItem[];
}

export function MemberStatsGrid({ stats }: MemberStatsGridProps) {
  return (
    <View style={styles.grid}>
      {stats.map((stat, index) => {
        const iconName = (stat.icon as any) || 'activity';

        return (
          <View key={index} style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: stat.color }]}>
              <Feather name={iconName} size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.value} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  label: {
    fontSize: TypographyScale.caption,
    fontWeight: '500',
    color: BrandColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
