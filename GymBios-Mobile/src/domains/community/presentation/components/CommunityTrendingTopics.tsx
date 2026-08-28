import { StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

import type { TrendingTopic } from '../../domain/community.types';

interface CommunityTrendingTopicsProps {
  topics: TrendingTopic[];
}

export function CommunityTrendingTopics({ topics }: CommunityTrendingTopicsProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  if (topics.length === 0) {
    return (
      <Typography variant="bodySmall" color="textSecondary" style={styles.empty}>
        No trending topics yet.
      </Typography>
    );
  }

  return (
    <View style={styles.container}>
      {topics.map((t, index) => (
        <View key={t.topic} style={styles.row}>
          <View style={styles.rankWrap}>
            <Typography variant="caption" style={[styles.rank, { color: primaryColor }]}>
              {index + 1}
            </Typography>
          </View>
          <Feather name="hash" size={14} color={primaryColor} />
          <Typography variant="bodySmall" style={styles.topic} numberOfLines={1}>
            {t.topic}
          </Typography>
          <View style={styles.countBadge}>
            <Typography variant="caption" style={styles.countText}>
              {t.postCount} {t.postCount === 1 ? 'post' : 'posts'}
            </Typography>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  rankWrap: {
    width: 20,
    alignItems: 'center',
  },
  rank: {
    fontWeight: '700',
  },
  topic: {
    flex: 1,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countText: {
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
});
