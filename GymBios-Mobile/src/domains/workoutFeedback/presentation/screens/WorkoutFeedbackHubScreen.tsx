import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Spacing, BrandColors } from '@/core/theme';
import { WorkoutFeedbackHubItem } from '../components/WorkoutFeedbackHubItem';

export function WorkoutFeedbackHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      
      <ScrollView contentContainerStyle={styles.content}>
        <WorkoutFeedbackHubItem
          title="Check-in Form"
          description="Capture member feedback for eligible sessions"
          icon="check-square"
          onPress={() => router.push('/(admin)/workout-feedback/check-in')}
        />
        
        <WorkoutFeedbackHubItem
          title="Recent Feedback"
          description="View submitted feedback and follow-ups"
          icon="message-square"
          onPress={() => router.push('/(admin)/workout-feedback/recent')}
        />
        
        <WorkoutFeedbackHubItem
          title="Analytics"
          description="Feedback trends and response rates"
          icon="bar-chart-2"
          onPress={() => router.push('/(admin)/workout-feedback/analytics')}
        />
        
        <WorkoutFeedbackHubItem
          title="Active Sessions"
          description="View current in-progress workouts"
          icon="activity"
          onPress={() => router.push('/(admin)/workout-feedback/active-sessions')}
        />
        
        <WorkoutFeedbackHubItem
          title="Stats"
          description="Key performance indicators"
          icon="pie-chart"
          onPress={() => router.push('/(admin)/workout-feedback/stats')}
        />
      </ScrollView>
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
  },
});
