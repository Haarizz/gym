import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useWorkoutFeedbackAnalytics } from '../../hooks/useWorkoutFeedback';
import { Typography } from '@/shared/components/Typography';
import { StatCard } from '@/shared/components/StatCard';

export function WorkoutFeedbackAnalyticsScreen() {
  const { data: analytics, isLoading, isError, refetch, isRefetching } = useWorkoutFeedbackAnalytics();

  return (
    <View style={styles.container}>
      <AppHeader title="Analytics" subtitle="Workout Feedback" colors={['#327f74', '#2a6b62']} onBack={() => router.back()} />
      
      {isLoading && !isRefetching ? (
        <Loader style={styles.center} />
      ) : isError ? (
        <EmptyState
          title="Error loading analytics"
          description="Could not load analytics data at this time."
          icon="alert-triangle"
        />
      ) : !analytics ? (
        <EmptyState
          title="No analytics available"
          description="No analytics data exists for workout feedback."
          icon="bar-chart-2"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BrandColors.teal} />
          }
        >
          <View style={styles.statsGrid}>
            <StatCard
              label="Today's Feedback"
              value={(analytics.todayFeedback ?? 0).toString()}
              iconName="check-circle"
              color="#16a34a"
            />
            <StatCard
              label="Total Responses"
              value={(analytics.totalFeedback ?? 0).toString()}
              iconName="message-square"
              color="#2563eb"
            />
          </View>
          
          <View style={styles.statsGrid}>
            <StatCard
              label="Avg Satisfaction"
              value={(analytics.avgSatisfaction ?? 0).toFixed(1)}
              iconName="star"
              color="#eab308"
            />
            <StatCard
              label="Recommendation %"
              value={`${(analytics.recommendationRate ?? 0).toFixed(1)}%`}
              iconName="thumbs-up"
              color="#9333ea"
            />
          </View>
          
          <View style={styles.statsGrid}>
            <StatCard
              label="Response Rate"
              value={`${(analytics.responseRate ?? 0).toFixed(1)}%`}
              iconName="bar-chart-2"
              color="#4f46e5"
            />
            <StatCard
              label="Sessions Today"
              value={(analytics.completedSessions ?? 0).toString()}
              iconName="activity"
              color="#ea580c"
            />
          </View>
          
          <View style={styles.statsGrid}>
            <StatCard
              label="Follow-ups"
              value={(analytics.followUpCount ?? 0).toString()}
              iconName="bell"
              color="#ca8a04"
            />
            <StatCard
              label="Flagged"
              value={(analytics.flaggedCount ?? 0).toString()}
              iconName="flag"
              color="#dc2626"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: BrandColors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  placeholderText: {
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
});
