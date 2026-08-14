import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatCard } from '@/shared/components/StatCard';
import { WorkoutFeedbackAnalytics } from '../../domain';
import { Spacing } from '@/core/theme';

interface FeedbackStatsCardsProps {
  analytics: WorkoutFeedbackAnalytics;
}

export function FeedbackStatsCards({ analytics }: FeedbackStatsCardsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.col}>
          <StatCard
            label="Today's Feedback"
            value={String(analytics.todayFeedback ?? (analytics as any).today_feedback ?? 0)}
            iconName="check-circle"
            color="green"
          />
        </View>
        <View style={styles.col}>
          <StatCard
            label="Total Responses"
            value={String(analytics.totalFeedback ?? (analytics as any).total_feedback ?? 0)}
            iconName="message-square"
            color="blue"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <StatCard
            label="Avg Satisfaction"
            value={Number(analytics.avgSatisfaction ?? (analytics as any).avg_satisfaction ?? 0).toFixed(1)}
            iconName="star"
            color="yellow"
          />
        </View>
        <View style={styles.col}>
          <StatCard
            label="Recommend Rate"
            value={`${Number(analytics.recommendationRate ?? (analytics as any).recommendation_rate ?? 0).toFixed(1)}%`}
            iconName="thumbs-up"
            color="purple"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <StatCard
            label="Response Rate"
            value={`${Number(analytics.responseRate ?? (analytics as any).response_rate ?? 0).toFixed(1)}%`}
            iconName="bar-chart-2"
            color="indigo"
          />
        </View>
        <View style={styles.col}>
          <StatCard
            label="Sessions Today"
            value={String(analytics.completedSessions ?? (analytics as any).completed_sessions ?? 0)}
            iconName="activity"
            color="orange"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <StatCard
            label="Follow-ups"
            value={String(analytics.followUpCount ?? (analytics as any).follow_up_count ?? 0)}
            iconName="bell"
            color="yellow"
          />
        </View>
        <View style={styles.col}>
          <StatCard
            label="Flagged"
            value={String(analytics.flaggedCount ?? (analytics as any).flagged_count ?? 0)}
            iconName="alert-triangle"
            color="red"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
  },
});
