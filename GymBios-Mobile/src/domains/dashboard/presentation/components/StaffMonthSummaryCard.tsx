import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { StaffMonthSummary } from '../../domain/StaffDashboardData';

interface StaffMonthSummaryCardProps {
  summary: StaffMonthSummary;
}

export function StaffMonthSummaryCard({ summary }: StaffMonthSummaryCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Month</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Target Achievement</Text>
        <Text style={[styles.value, { color: '#16A34A' }]}>{summary.targetAchievement}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Total Conversions</Text>
        <Text style={styles.value}>{summary.totalConversions}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Revenue Generated</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>{summary.revenueGenerated}</Text>
      </View>

      <View style={[styles.row, styles.lastRow]}>
        <Text style={styles.label}>Conversion Rate</Text>
        <Text style={styles.value}>{summary.conversionRate}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
