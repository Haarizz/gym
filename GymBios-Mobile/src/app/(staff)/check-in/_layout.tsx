import { Stack } from 'expo-router';

/**
 * Staff Check-In module stack navigator.
 * All screens share headerShown: false so each screen renders its own AppHeader.
 */
export default function StaffCheckInStack() {
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
