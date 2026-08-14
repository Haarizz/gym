import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useWorkoutFeedback } from '../../hooks/useWorkoutFeedback';
import { RecentFeedbackCard } from '../components/RecentFeedbackCard';
import { WorkoutFeedback } from '../../domain';
import { WorkoutFeedbackDetailsSheet } from '../components/WorkoutFeedbackDetailsSheet';
import { useState } from 'react';

export function RecentWorkoutFeedbackScreen() {
  const { data: feedbacks, isLoading, isError, refetch, isRefetching } = useWorkoutFeedback();
  const [selectedFeedback, setSelectedFeedback] = useState<WorkoutFeedback | null>(null);

  const handlePress = (feedback: WorkoutFeedback) => {
    setSelectedFeedback(feedback);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Recent Feedback" subtitle="Workout Feedback" colors={['#327f74', '#2a6b62']} onBack={() => router.back()} />
      
      {isLoading && !isRefetching ? (
        <Loader style={styles.center} />
      ) : isError ? (
        <EmptyState
          title="Error loading feedback"
          description="Could not load workout feedback at this time."
          icon="alert-triangle"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={feedbacks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecentFeedbackCard
              feedback={item}
              onPress={handlePress}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No feedback yet"
              description="Submitted workout feedback will appear here."
              icon="message-square"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BrandColors.teal} />
          }
        />
      )}
      
      <WorkoutFeedbackDetailsSheet
        visible={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        feedback={selectedFeedback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
