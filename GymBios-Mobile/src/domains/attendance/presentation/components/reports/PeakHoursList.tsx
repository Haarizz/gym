import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { PeakHourRow } from '../../../domain/AttendanceReport';
import { AttendanceSection } from '../shared';

interface PeakHoursListProps {
  rows: PeakHourRow[];
}

const DAY_KEYS: Array<keyof PeakHourRow> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Sum visits across all day-of-week columns for a peak-hours row. */
function rowTotal(row: PeakHourRow): number {
  return DAY_KEYS.reduce((sum, key) => sum + ((row[key] as number | undefined) ?? 0), 0);
}

export function PeakHoursList({ rows }: PeakHoursListProps) {
  // Sort by total visits descending and show top 8 hours.
  const sorted = [...rows]
    .sort((a, b) => rowTotal(b) - rowTotal(a))
    .slice(0, 8);

  const maxVisits = Math.max(...sorted.map(rowTotal), 1);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <AttendanceSection title="Peak Hours">
      <View style={styles.list}>
        {sorted.map((row, index) => {
          const visits = rowTotal(row);
          const barWidth = `${Math.max((visits / maxVisits) * 100, 2)}%`;
          return (
            <View key={`${row.hour}-${index}`} style={styles.row}>
              {/* Use full label when available (e.g. "6:00 AM"), else short hour */}
              <Typography variant="caption" style={styles.hour}>
                {row.label ?? row.hour}
              </Typography>
              <View style={styles.track}>
                <View style={[styles.bar, { width: barWidth as `${number}%` }]} />
              </View>
              <Typography variant="caption" style={styles.visits}>
                {visits}
              </Typography>
            </View>
          );
        })}
      </View>
    </AttendanceSection>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hour: {
    width: 64,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.full,
  },
  visits: {
    width: 28,
    textAlign: 'right',
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
