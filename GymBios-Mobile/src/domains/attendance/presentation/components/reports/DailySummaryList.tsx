import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { DailySummaryRow } from '../../../domain/AttendanceReport';
import { AttendanceSection, formatAvgDuration, formatDateLabel } from '../shared';

interface DailySummaryListProps {
  rows: DailySummaryRow[];
}

export function DailySummaryList({ rows }: DailySummaryListProps) {
  if (rows.length === 0) {
    return (
      <AttendanceSection title="Daily Summary">
        <Typography variant="caption" color="textSecondary">
          No daily data for this period.
        </Typography>
      </AttendanceSection>
    );
  }

  return (
    <AttendanceSection title="Daily Summary">
      <View style={styles.list}>
        {rows.map((row, index) => (
          <View key={`${row.fullDate ?? row.date}-${index}`} style={styles.row}>
            <View style={styles.dateCol}>
              {/* Use the formatted label if available, otherwise parse fullDate */}
              <Typography variant="bodySmallBold">
                {row.date ?? formatDateLabel(row.fullDate)}
              </Typography>
            </View>
            <View style={styles.statsCol}>
              <Typography variant="bodySmallBold" style={styles.visits}>
                {row.visits ?? 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {row.avgDuration ? formatAvgDuration(row.avgDuration) : '—'}
              </Typography>
            </View>
          </View>
        ))}
      </View>
    </AttendanceSection>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateCol: {
    flex: 1,
    gap: 2,
  },
  statsCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  visits: {
    color: BrandColors.teal,
  },
});
