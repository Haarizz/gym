import { Stack } from 'expo-router';

/**
 * Attendance module stack navigator.
 * All screens share headerShown: false so each screen renders its own
 * AppHeader (consistent with the rest of the app).
 */
export default function AttendanceStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="today" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="trends" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
