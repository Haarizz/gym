import { StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';

import type { LeaderboardEntry } from '../../domain/community.types';

/* const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD7F32']; */

function getRankColor(index: number, primaryColor: string): string {
  const RANK_COLORS = ['#eab308', '#94a3b8', '#b45309'];
  return RANK_COLORS[index] ?? primaryColor;
}

interface CommunityLeaderboardProps {
  entries: LeaderboardEntry[];
}

export function CommunityLeaderboard({ entries }: CommunityLeaderboardProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {entries.map((entry, index) => {
        const rankColor = getRankColor(index, primaryColor);
        const initials = entry.username?.slice(0, 2).toUpperCase() ?? '??';

        return (
          <View
            key={entry.userId}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
          >
            {/* Rank */}
            <View style={[styles.rankBadge, { backgroundColor: rankColor + '22' }]}>
              {index < 3 ? (
                <Feather name="award" size={14} color={rankColor} />
              ) : (
                <Typography variant="caption" style={[styles.rankNum, { color: rankColor }]}>
                  {index + 1}
                </Typography>
              )}
            </View>

            {/* Avatar + name */}
            <Avatar initials={initials} size={36} backgroundColor={rankColor + '44'} textColor={theme.text} />
            <View style={styles.info}>
              <Typography variant="bodySmallBold" numberOfLines={1}>
                {entry.username}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {entry.totalPosts ?? 0} posts · {entry.totalLikes ?? 0} likes
              </Typography>
            </View>

            {/* Score */}
            <View style={[styles.scoreBadge, { backgroundColor: primaryColor + '18' }]}>
              <Typography variant="caption" style={[styles.scoreText, { color: primaryColor }]}>
                {(entry.engagementScore ?? 0).toLocaleString()} pts
              </Typography>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontWeight: '700',
    fontSize: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  scoreText: {
    fontWeight: '700',
    fontSize: 11,
  },
});
