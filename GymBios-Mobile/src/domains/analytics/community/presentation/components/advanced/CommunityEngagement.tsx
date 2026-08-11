import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ChartContainer, LineChart, Surface, Typography } from '@/shared/components';
import type {
  CommunityFeatureEngagement,
  EngagementAnalyticsData,
  WeeklyActivityPoint,
} from '../../../domain/communityAdvancedAnalyticsData.types';

interface CommunityEngagementProps {
  engagementData?: EngagementAnalyticsData;
}

export function CommunityEngagement({ engagementData }: CommunityEngagementProps) {
  const weekly = engagementData?.weeklyActivity ?? [];
  const features = engagementData?.communityFeatures ?? [];

  const chartData = weekly.map((w: WeeklyActivityPoint) => ({
    x: w.week,
    Posts: w.posts,
    Engagement: w.engagement,
  }));

  return (
    <View style={styles.container}>
      {/* Weekly Activity LineChart */}
      <ChartContainer
        title="Weekly Community Activity"
        description="Posts vs Total Engagement (Likes + Comments)"
        empty={weekly.length === 0}
        emptyTitle="No activity data"
        emptyDescription="Community posts and interactions will display here."
        height={220}
      >
        <LineChart
          data={chartData}
          xKey="x"
          series={[
            {
              key: 'Posts',
              label: 'Posts',
              color: '#3B82F6',
            },
            {
              key: 'Engagement',
              label: 'Engagement',
              color: BrandColors.teal,
            },
          ]}
          height={180}
        />
      </ChartContainer>

      {/* Feature Engagement List */}
      <Surface background="backgroundElement" style={styles.card}>
        <Typography variant="bodySmallBold" style={styles.title}>
          Feature Usage Breakdown
        </Typography>

        {features.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Typography variant="caption" color="textSecondary">
              No feature usage data available.
            </Typography>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {features.map((feat: CommunityFeatureEngagement, idx: number) => (
              <View key={`${feat.feature}-${idx}`} style={styles.featRow}>
                <View style={styles.featInfo}>
                  <Typography variant="bodySmallBold" style={styles.featName}>
                    {feat.feature}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {feat.posts} posts • {feat.likes} likes • {feat.comments} comments
                  </Typography>
                </View>

                <View style={styles.usageBadge}>
                  <Typography variant="caption" style={styles.usageText}>
                    {feat.usage}%
                  </Typography>
                </View>
              </View>
            ))}
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  emptyContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  listContainer: {
    gap: Spacing.two,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  featInfo: {
    flex: 1,
  },
  featName: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  usageBadge: {
    backgroundColor: 'rgba(50, 127, 116, 0.12)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  usageText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
