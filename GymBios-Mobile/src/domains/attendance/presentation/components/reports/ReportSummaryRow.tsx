import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ReportSummary } from '../../../domain/AttendanceReport';
import { AttendanceSection } from '../shared';

interface ReportSummaryRowProps {
  summary: ReportSummary;
}

export function ReportSummaryRow({ summary }: ReportSummaryRowProps) {
  const cards = [
    { label: 'Total Check-ins', value: String(summary.totalVisits ?? 0) },
    { label: 'Avg Daily', value: String(summary.avgDailyVisits ?? 0) },
    { label: 'Rate', value: summary.attendanceRate != null ? `${summary.attendanceRate}%` : '—' },
    { label: 'Peak Hour', value: summary.peakHour || '—' },
    { label: 'Active Members', value: String(summary.totalActiveMembers ?? 0) },
    { label: 'Days in Range', value: String(summary.daysInRange ?? 0) },
  ];

  return (
    <AttendanceSection title="Summary">
      <View style={styles.grid}>
        {cards.map(card => (
          <View key={card.label} style={styles.card}>
            <Typography variant="caption" color="textSecondary">
              {card.label}
            </Typography>
            <Typography variant="bodySmallBold" style={styles.value}>
              {card.value}
            </Typography>
          </View>
        ))}
      </View>
    </AttendanceSection>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  value: {
    color: BrandColors.teal,
    fontSize: 18,
  },
});
