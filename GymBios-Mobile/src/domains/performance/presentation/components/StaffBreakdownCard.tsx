import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PerformanceBreakdown } from '../../domain/StaffPerformanceData';

interface StaffBreakdownCardProps {
  breakdown: PerformanceBreakdown;
}

export function StaffBreakdownCard({ breakdown }: StaffBreakdownCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Breakdown</Text>

      {/* Conversion Rate */}
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.label}>Conversion Rate</Text>
          <Text style={styles.value}>{breakdown.conversionRate}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${breakdown.conversionRate}%`, backgroundColor: BrandColors.teal },
            ]}
          />
        </View>
      </View>

      {/* Follow-up Completion */}
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.label}>Follow-up Completion</Text>
          <Text style={styles.value}>{breakdown.followUpCompletion}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${breakdown.followUpCompletion}%`,
                backgroundColor: BrandColors.memberGold,
              },
            ]}
          />
        </View>
      </View>

      {/* Customer Satisfaction */}
      <View style={[styles.item, styles.lastItem]}>
        <View style={styles.itemHeader}>
          <Text style={styles.label}>Customer Satisfaction</Text>
          <Text style={styles.value}>{breakdown.customerSatisfaction}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${breakdown.customerSatisfaction}%`,
                backgroundColor: '#16A34A',
              },
            ]}
          />
        </View>
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
    marginBottom: Spacing.three,
  },
  item: {
    marginBottom: Spacing.three,
  },
  lastItem: {
    marginBottom: 0,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
