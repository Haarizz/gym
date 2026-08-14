import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useWorkoutSessions } from '../../hooks/useWorkoutFeedback';
import { WorkoutSessionCard } from '../components/WorkoutSessionCard';

export function ActiveWorkoutSessionsScreen() {
  const { data: sessions, isLoading, isError, refetch, isRefetching } = useWorkoutSessions();

  // Filter for active/in-progress sessions (as per reference, status 'in-progress' or similar if supported)
  const activeSessions = sessions?.filter((s) => s.status === 'in-progress' || s.status === 'active') || [];

  return (
    <View style={styles.container}>
      <AppHeader title="Active Sessions" subtitle="Workout Feedback" colors={['#327f74', '#2a6b62']} onBack={() => router.back()} />
      
      {isLoading && !isRefetching ? (
        <Loader style={styles.center} />
      ) : isError ? (
        <EmptyState
          title="Error loading sessions"
          description="Could not load active sessions at this time."
          icon="alert-triangle"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={activeSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutSessionCard
              session={item}
              onPress={() => {}}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No active sessions"
              description="There are currently no active workout sessions."
              icon="activity"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BrandColors.teal} />
          }
        />
      )}
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
