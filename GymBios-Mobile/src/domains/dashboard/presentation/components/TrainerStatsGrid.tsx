import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerTodayStats } from '../../domain/TrainerDashboardData';

interface TrainerStatsGridProps {
  stats: TrainerTodayStats;
}

export function TrainerStatsGrid({ stats }: TrainerStatsGridProps) {
  return (
    <View style={styles.grid}>
      {/* Sessions Today */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(50, 127, 116, 0.15)' }]}>
            <Feather name="calendar" size={16} color={BrandColors.teal} />
          </View>
          <Text style={styles.cardLabel}>Sessions Today</Text>
        </View>
        <Text style={styles.cardValue}>
          {stats.sessionsCompleted}/{stats.sessionsScheduled}
        </Text>
      </View>

      {/* Today's Earnings */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 199, 66, 0.15)' }]}>
            <Feather name="dollar-sign" size={16} color={BrandColors.memberGold} />
          </View>
          <Text style={styles.cardLabel}>Today's Earnings</Text>
        </View>
        <Text style={[styles.cardValue, { color: BrandColors.memberGold }]}>
          {stats.todayEarnings}
        </Text>
      </View>

      {/* Active Members */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
            <Feather name="users" size={16} color="#9333EA" />
          </View>
          <Text style={styles.cardLabel}>Active Members</Text>
        </View>
        <Text style={styles.cardValue}>{stats.activeMembers}</Text>
      </View>

      {/* Monthly Target */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <Feather name="target" size={16} color="#16A34A" />
          </View>
          <Text style={styles.cardLabel}>Monthly Target</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#16A34A' }]}>
          {stats.monthlyTargetPercentage}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
});
