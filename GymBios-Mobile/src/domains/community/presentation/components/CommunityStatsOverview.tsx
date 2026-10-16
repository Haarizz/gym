import { useTranslation } from 'react-i18next';
import { tOr } from '@/core/i18n';
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
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  return (
    <View>
      {/* Overview row */}
      <View style={styles.row}>
        <StatCard
          label={t('community.stats.totalPosts')}
          value={String(stats.totalPosts ?? 0)}
          iconName="file-text"
          color={primaryColor}
        />
        <StatCard
          label={t('community.stats.totalLikes')}
          value={String(stats.totalLikes ?? 0)}
          iconName="heart"
          color="#ef4444"
        />
        <StatCard
          label={t('community.stats.comments')}
          value={String(stats.totalComments ?? 0)}
          iconName="message-circle"
          color="#3b82f6"
        />
      </View>

      {/* Type breakdown */}
      {stats.byType && stats.byType.length > 0 && (
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            {t('community.stats.breakdown')}
          </Typography>
          {stats.byType.map((row) => (
            <View key={row.type} style={styles.typeRow}>
              <View style={[styles.typeDot, { backgroundColor: getTypeColor(row.type, primaryColor) }]} />
              <Typography variant="bodySmall" style={styles.typeLabel}>
                {tOr(`community.typeNames.${row.type}`, row.type.charAt(0).toUpperCase() + row.type.slice(1))}
              </Typography>
              <Typography variant="bodySmall" color="textSecondary">
                {t('community.stats.breakdownRow', { posts: row.posts ?? 0, likes: row.likes ?? 0, comments: row.comments ?? 0 })}
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
