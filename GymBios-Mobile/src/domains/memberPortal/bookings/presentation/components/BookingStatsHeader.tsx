import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

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
      <View style={styles.card}>
        <Text style={styles.label}>Upcoming</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>
          {upcomingCount}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>This Week</Text>
        <Text style={[styles.value, { color: BrandColors.teal }]}>
          {thisWeekCount}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Attended</Text>
        <Text style={[styles.value, { color: BrandColors.trainerAmber }]}>
          {attendedCount}
        </Text>
      </View>
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
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
