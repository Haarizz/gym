import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useWorkoutFeedbackAnalytics } from '../../hooks/useWorkoutFeedback';
import { FeedbackStatsCards } from '../components/FeedbackStatsCards';

export function WorkoutFeedbackStatsScreen() {
  const { data: analytics, isLoading, isError, refetch, isRefetching } = useWorkoutFeedbackAnalytics();

  return (
    <View style={styles.container}>
      <AppHeader title="Stats" subtitle="Workout Feedback" colors={['#327f74', '#2a6b62']} onBack={() => router.back()} />
      
      {isLoading && !isRefetching ? (
        <Loader style={styles.center} />
      ) : isError ? (
        <EmptyState
          title="Error loading stats"
          description="Could not load stats data at this time."
          icon="alert-triangle"
        />
      ) : !analytics ? (
        <EmptyState
          title="No stats available"
          description="No data exists for workout feedback."
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
          <FeedbackStatsCards analytics={analytics} />
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
});
