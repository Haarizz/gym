import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useWorkoutSessions } from '../../hooks/useWorkoutFeedback';
import { WorkoutSessionCard } from '../components/WorkoutSessionCard';
import { WorkoutFeedbackFormSheet } from '../components/WorkoutFeedbackFormSheet';
import { useWorkoutFeedbackForm } from '../hooks/useWorkoutFeedbackForm';

export function WorkoutCheckInFormScreen() {
  const { data: sessions, isLoading, isError, refetch, isRefetching } = useWorkoutSessions();
  const formManager = useWorkoutFeedbackForm();

  // Filter out non-completed sessions
  const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];

  return (
    <View style={styles.container}>
      <AppHeader title="Check-in Form" subtitle="Workout Feedback" colors={['#327f74', '#2a6b62']} onBack={() => router.back()} />
      
      {isLoading && !isRefetching ? (
        <Loader style={styles.center} />
      ) : isError ? (
        <EmptyState
          title="Error loading sessions"
          description="Could not load workout sessions at this time."
          icon="alert-triangle"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={completedSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutSessionCard
              session={item}
              onPress={formManager.openSheetForSession}
              isSelected={formManager.selectedSession?.id === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No completed workout sessions"
              description="There are no eligible workout sessions available for feedback."
              icon="check-circle"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BrandColors.teal} />
          }
        />
      )}

      <WorkoutFeedbackFormSheet
        visible={formManager.isSheetVisible}
        onClose={formManager.closeSheet}
        session={formManager.selectedSession}
        formState={formManager.formState}
        updateField={formManager.updateField}
        toggleArrayField={formManager.toggleArrayField}
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
