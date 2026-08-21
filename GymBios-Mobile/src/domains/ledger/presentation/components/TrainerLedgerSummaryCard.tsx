import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerEarningsSummary } from '../../domain/TrainerLedgerData';

interface TrainerLedgerSummaryCardProps {
  summary: TrainerEarningsSummary;
}

export function TrainerLedgerSummaryCard({ summary }: TrainerLedgerSummaryCardProps) {
  return (
    <LinearGradient
      colors={[BrandColors.trainerAmber, '#D97706']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Earnings Summary</Text>

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.label}>This Month</Text>
          <Text style={styles.largeValue}>₹{(summary.thisMonth / 1000).toFixed(0)}K</Text>
        </View>

        <View style={styles.gridCol}>
          <Text style={styles.label}>Last Month</Text>
          <Text style={styles.mediumValue}>₹{(summary.lastMonth / 1000).toFixed(0)}K</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Paid</Text>
          <Text style={[styles.smallValue, styles.paidValue]}>
            ₹{(summary.paid / 1000).toFixed(0)}K
          </Text>
        </View>

        <View style={styles.gridCol}>
          <Text style={styles.label}>Pending</Text>
          <Text style={[styles.smallValue, styles.pendingValue]}>
            ₹{(summary.pending / 1000).toFixed(0)}K
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.three,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2,
  },
  largeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mediumValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smallValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  paidValue: {
    color: '#BBF7D0',
  },
  pendingValue: {
    color: '#FEF08A',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginVertical: Spacing.three,
  },
});
