import { Stack } from 'expo-router';

/**
 * Walk-In sub-module stack navigator.
 * Manages the Hub → Register / Visitors navigation.
 */
export default function WalkInStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="visitors" />
    </Stack>
  );
}
