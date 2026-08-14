import React from 'react';
import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Avatar } from '@/shared/components/Avatar';
import type { Referral } from '../../domain/Referral';

interface LeaderboardMember {
  id: string;
  name: string;
  email: string;
  successfulCount: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

interface ReferralLeaderboardProps {
  referrals: Referral[];
}

export function ReferralLeaderboard({ referrals }: ReferralLeaderboardProps) {
  // Aggregate top referrers from actual referral data
  const referrersMap: Record<string, LeaderboardMember> = {};

  referrals.forEach((ref) => {
    const key = ref.referrerName || 'Unknown';
    if (!referrersMap[key]) {
      referrersMap[key] = {
        id: key,
        name: ref.referrerName || 'Unknown',
        email: ref.refereeEmail ? `ref-${key.toLowerCase().replace(/\s+/g, '')}@gym.com` : '',
        successfulCount: 0,
        tier: 'Bronze',
      };
    }
    if (ref.status === 'successful') {
      referrersMap[key].successfulCount++;
    }
  });

  const topReferrers = Object.values(referrersMap)
    .map((m) => {
      const s = m.successfulCount;
      const tier: LeaderboardMember['tier'] =
        s >= 11 ? 'Platinum' : s >= 6 ? 'Gold' : s >= 3 ? 'Silver' : 'Bronze';
      return { ...m, tier };
    })
    .sort((a, b) => b.successfulCount - a.successfulCount)
    .slice(0, 5);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return { bg: '#f3e8ff', text: '#7e22ce', icon: 'award' as const };
      case 'Gold':
        return { bg: '#fef3c7', text: '#b45309', icon: 'sun' as const };
      case 'Silver':
        return { bg: '#f1f5f9', text: '#475569', icon: 'star' as const };
      case 'Bronze':
      default:
        return { bg: '#ffedd5', text: '#c2410c', icon: 'target' as const };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Feather name="award" size={18} color="#d97706" />
        </View>
        <View style={styles.headerTitles}>
          <Typography variant="subtitle" style={styles.title}>
            Top Referrers
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Members with highest successful referrals
          </Typography>
        </View>
      </View>

      <View style={styles.list}>
        {topReferrers.length === 0 ? (
          <Typography variant="bodySmall" color="textSecondary" style={styles.emptyText}>
            No top referrers recorded yet.
          </Typography>
        ) : (
          topReferrers.map((item, index) => {
            const tierStyle = getTierColor(item.tier);
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.rankBadge}>
                  <Typography variant="caption" style={styles.rankText}>
                    {index + 1}
                  </Typography>
                </View>

                <Avatar name={item.name} size="md" style={styles.avatar} />

                <View style={styles.memberInfo}>
                  <Typography variant="bodySmall" style={styles.memberName}>
                    {item.name}
                  </Typography>
                  {item.email ? (
                    <Typography variant="caption" color="textSecondary">
                      {item.email}
                    </Typography>
                  ) : null}
                </View>

                <View style={styles.statsCol}>
                  <Typography variant="bodySmall" style={styles.countText}>
                    {item.successfulCount} referrals
                  </Typography>
                  <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                    <Feather name={tierStyle.icon} size={10} color={tierStyle.text} />
                    <Typography variant="caption" style={[styles.tierText, { color: tierStyle.text }]}>
                      {item.tier}
                    </Typography>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  list: {
    gap: Spacing.two,
  },
  emptyText: {
    fontStyle: 'italic',
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: Spacing.two,
    borderRadius: Radius.md,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  avatar: {
    marginRight: Spacing.two,
  },
  memberInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  statsCol: {
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: 2,
    gap: 3,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
