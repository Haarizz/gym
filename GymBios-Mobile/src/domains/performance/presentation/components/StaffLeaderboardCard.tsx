import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { LeaderboardItem } from '../../domain/StaffPerformanceData';

interface StaffLeaderboardCardProps {
  leaderboard: LeaderboardItem[];
}

export function StaffLeaderboardCard({ leaderboard }: StaffLeaderboardCardProps) {
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return BrandColors.memberGold;
    if (rank === 2) return BrandColors.trainerAmber;
    return '#94A3B8';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="award" size={18} color={BrandColors.memberGold} />
        <Text style={styles.title}>Branch Leaderboard</Text>
      </View>

      <View style={styles.list}>
        {leaderboard.map((item, idx) => {
          const badgeColor = getRankBadgeColor(item.rank);
          return (
            <View key={idx} style={styles.itemRow}>
              <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.metricsRow}>
                  <Text style={styles.metricsText}>{item.conversions} conversions</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={[styles.metricsText, styles.revenueText]}>{item.revenue}</Text>
                </View>
              </View>

              {item.isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>YOU</Text>
                </View>
              )}
            </View>
          );
        })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  list: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsText: {
    fontSize: 12,
    color: '#64748B',
  },
  dot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  revenueText: {
    fontWeight: '600',
    color: BrandColors.teal,
  },
  youBadge: {
    backgroundColor: BrandColors.teal,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  youText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
