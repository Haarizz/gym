import { Stack } from 'expo-router';

/**
 * Trainer Check-In module stack navigator.
 * All screens share headerShown: false so each screen renders its own AppHeader.
 */
export default function TrainerCheckInStack() {
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
