import React from 'react';
import { Stack } from 'expo-router';

export default function WorkoutFeedbackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="recent" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="active-sessions" />
      <Stack.Screen name="stats" />
    </Stack>
  );
}
