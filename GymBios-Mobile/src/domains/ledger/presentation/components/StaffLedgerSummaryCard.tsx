import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { EarningsSummary } from '../../domain/StaffLedgerData';

interface StaffLedgerSummaryCardProps {
  summary: EarningsSummary;
}

export function StaffLedgerSummaryCard({ summary }: StaffLedgerSummaryCardProps) {
  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Earnings Summary</Text>

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.label}>This Month</Text>
          <Text style={styles.largeValue}><CurrencyValue amount={summary.thisMonth} compact /></Text>
        </View>

        <View style={styles.gridCol}>
          <Text style={styles.label}>Last Month</Text>
          <Text style={styles.mediumValue}><CurrencyValue amount={summary.lastMonth} compact /></Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Base Salary</Text>
          <Text style={styles.smallValue}><CurrencyValue amount={summary.baseSalary} compact /></Text>
        </View>

        <View style={styles.gridCol}>
          <Text style={styles.label}>Commission</Text>
          <Text style={[styles.smallValue, styles.commissionValue]}>
            <CurrencyValue amount={summary.commission} compact />
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#FFFFFF',
  },
  commissionValue: {
    color: '#BBF7D0',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: Spacing.three,
  },
});
