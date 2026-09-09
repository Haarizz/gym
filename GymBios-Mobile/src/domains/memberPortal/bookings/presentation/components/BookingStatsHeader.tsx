import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.grid}>
      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>Upcoming</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>
          {upcomingCount}
        </Text>
      </GlassSurface>

      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>This Week</Text>
        <Text style={[styles.value, { color: BrandColors.teal }]}>
          {thisWeekCount}
        </Text>
      </GlassSurface>

      <GlassSurface radius={Radius.md} style={styles.card}>
        <Text style={styles.label}>Attended</Text>
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
