import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';

interface BookingStatsHeaderProps {
  upcomingCount: number;
  thisWeekCount: number;
  attendedCount: number;
}

export function BookingStatsHeader({
  upcomingCount,
  thisWeekCount,
  attendedCount,
}: BookingStatsHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid}>
      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>{t('bookings.stats.upcoming')}</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>
          {upcomingCount}
        </Text>
      </GlassSurface>

      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>{t('bookings.stats.thisWeek')}</Text>
        <Text style={[styles.value, { color: BrandColors.teal }]}>
          {thisWeekCount}
        </Text>
      </GlassSurface>

      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>{t('bookings.stats.attended')}</Text>
        <Text style={[styles.value, { color: BrandColors.trainerAmber }]}>
          {attendedCount}
        </Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
  },
});
