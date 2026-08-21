import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerScheduleStats } from '../../domain/TrainerScheduleData';

interface TrainerScheduleStatsGridProps {
  stats: TrainerScheduleStats;
}

export function TrainerScheduleStatsGrid({ stats }: TrainerScheduleStatsGridProps) {
  return (
    <View style={styles.container}>
      {/* This Week */}
      <View style={styles.card}>
        <Text style={styles.label}>This Week</Text>
        <Text style={[styles.value, { color: BrandColors.trainerAmber }]}>{stats.thisWeek}</Text>
      </View>

      {/* Next Week */}
      <View style={styles.card}>
        <Text style={styles.label}>Next Week</Text>
        <Text style={[styles.value, { color: BrandColors.teal }]}>{stats.nextWeek}</Text>
      </View>

      {/* Open Slots */}
      <View style={styles.card}>
        <Text style={styles.label}>Open Slots</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>{stats.openSlots}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
});
