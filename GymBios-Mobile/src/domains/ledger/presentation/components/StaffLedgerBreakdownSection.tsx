import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { CommissionStructureItem, EarningsBreakdownItem } from '../../domain/StaffLedgerData';

interface StaffLedgerBreakdownSectionProps {
  breakdown: EarningsBreakdownItem[];
  commissionStructure: CommissionStructureItem[];
}

export function StaffLedgerBreakdownSection({
  breakdown,
  commissionStructure,
}: StaffLedgerBreakdownSectionProps) {
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
                <Text style={styles.itemAmount}>₹{item.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${item.percentage}%`, backgroundColor: BrandColors.teal },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Commission Structure Info */}
      <LinearGradient
        colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.commissionCard}
      >
        <Text style={styles.commissionTitle}>Commission Structure</Text>
        <View style={styles.commissionList}>
          {commissionStructure.map((item, idx) => (
            <View key={idx} style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>{item.label}</Text>
              <Text style={styles.commissionAmount}>{item.amount}</Text>
            </View>
          ))}
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
  commissionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  commissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  commissionList: {
    gap: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commissionLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  commissionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
