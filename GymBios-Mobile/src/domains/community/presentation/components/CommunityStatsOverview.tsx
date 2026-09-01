import { StyleSheet, View } from 'react-native';

import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { BrandColors, Spacing } from '@/core/theme';
import { StatCard, Typography } from '@/shared/components';

import type { CommunityStats } from '../../domain/community.types';

function getTypeColor(type: string, primaryColor: string): string {
  switch (type) {
    case 'achievement': return primaryColor;
    case 'question': return '#3b82f6';
    case 'tip': return '#8b5cf6';
    default: return '#94a3b8';
  }
}

interface CommunityStatsOverviewProps {
  stats: CommunityStats;
}

export function CommunityStatsOverview({ stats }: CommunityStatsOverviewProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  return (
    <View>
      {/* Overview row */}
      <View style={styles.row}>
        <StatCard
          label="Total Posts"
          value={String(stats.totalPosts ?? 0)}
          iconName="file-text"
          color={primaryColor}
        />
        <StatCard
          label="Total Likes"
          value={String(stats.totalLikes ?? 0)}
          iconName="heart"
          color="#ef4444"
        />
        <StatCard
          label="Comments"
          value={String(stats.totalComments ?? 0)}
          iconName="message-circle"
          color="#3b82f6"
        />
      </View>

      {/* Type breakdown */}
      {stats.byType && stats.byType.length > 0 && (
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            Post Type Breakdown
          </Typography>
          {stats.byType.map((t) => (
            <View key={t.type} style={styles.typeRow}>
              <View style={[styles.typeDot, { backgroundColor: getTypeColor(t.type, primaryColor) }]} />
              <Typography variant="bodySmall" style={styles.typeLabel}>
                {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
              </Typography>
              <Typography variant="bodySmall" color="textSecondary">
                {t.posts ?? 0} posts · {t.likes ?? 0} likes · {t.comments ?? 0} comments
              </Typography>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  section: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    flexWrap: 'wrap',
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeLabel: {
    fontWeight: '600',
    minWidth: 90,
  },
});
