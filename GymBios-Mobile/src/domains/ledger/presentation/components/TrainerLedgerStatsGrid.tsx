import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import type { TrainerQuickLedgerStats } from '../../domain/TrainerLedgerData';

interface TrainerLedgerStatsGridProps {
  stats: TrainerQuickLedgerStats;
}

export function TrainerLedgerStatsGrid({ stats }: TrainerLedgerStatsGridProps) {
  return (
    <View style={styles.container}>
      {/* Growth */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <Feather name="trending-up" size={16} color="#16A34A" />
          </View>
          <Text style={styles.label}>Growth</Text>
        </View>
        <Text style={[styles.value, { color: '#16A34A' }]}>{stats.growth}</Text>
        <Text style={styles.subtext}>vs last month</Text>
      </View>

      {/* Next Payout */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
            <Feather name="calendar" size={16} color="#2563EB" />
          </View>
          <Text style={styles.label}>Next Payout</Text>
        </View>
        <Text style={styles.value}>{stats.nextPayoutDate}</Text>
        <Text style={styles.subtext}>{stats.daysRemaining}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
