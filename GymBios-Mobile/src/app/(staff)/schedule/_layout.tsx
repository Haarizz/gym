import { Stack } from 'expo-router';

/**
 * Schedule module stack navigator.
 * All screens share headerShown: false so each screen renders its own
 * AppHeader (consistent with the rest of the app).
 */
export default function ScheduleStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
