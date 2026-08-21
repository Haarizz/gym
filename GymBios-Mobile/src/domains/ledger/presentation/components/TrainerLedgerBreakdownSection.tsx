import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerEarningsBreakdownItem, TrainerEarningsSummary } from '../../domain/TrainerLedgerData';

interface TrainerLedgerBreakdownSectionProps {
  breakdown: TrainerEarningsBreakdownItem[];
  summary: TrainerEarningsSummary;
}

export function TrainerLedgerBreakdownSection({
  breakdown,
  summary,
}: TrainerLedgerBreakdownSectionProps) {
  return (
    <View style={styles.container}>
      {/* Earnings Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Earnings Breakdown</Text>
        <View style={styles.breakdownList}>
          {breakdown.map((item, idx) => (
            <View key={idx} style={styles.breakdownItem}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemAmount}>
                  ₹{(item.amount / 1000).toFixed(1)}K
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: BrandColors.trainerAmber,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Monthly Comparison */}
      <LinearGradient
        colors={[BrandColors.teal, BrandColors.tealDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.comparisonCard}
      >
        <Text style={styles.comparisonTitle}>Monthly Comparison</Text>
        <View style={styles.comparisonList}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>This Month</Text>
            <Text style={styles.comparisonValue}>
              ₹{(summary.thisMonth / 1000).toFixed(0)}K
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Last Month</Text>
            <Text style={styles.comparisonValue}>
              ₹{(summary.lastMonth / 1000).toFixed(0)}K
            </Text>
          </View>
          <View style={[styles.comparisonRow, styles.growthRow]}>
            <Text style={styles.comparisonLabel}>Growth</Text>
            <Text style={[styles.comparisonValue, styles.growthValue]}>+5.4%</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  breakdownList: {
    gap: Spacing.three,
  },
  breakdownItem: {},
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemCategory: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  itemAmount: {
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
  comparisonCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  comparisonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  comparisonList: {
    gap: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  growthRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  comparisonLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  growthValue: {
    color: '#BBF7D0',
  },
});
