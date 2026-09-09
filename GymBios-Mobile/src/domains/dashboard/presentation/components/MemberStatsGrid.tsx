import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
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
          <GlassSurface key={index} radius={Radius.lg} style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: stat.color }]}>
              <Feather name={iconName} size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.value} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {stat.label}
            </Text>
          </GlassSurface>
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
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: TypographyScale.caption,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
});
