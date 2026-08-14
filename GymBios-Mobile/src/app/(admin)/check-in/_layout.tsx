import { Stack } from 'expo-router';

/**
 * Check-In module stack navigator.
 * All screens share headerShown: false so each screen renders its own
 * AppHeader (consistent with the rest of the app).
 *
 * Navigation tree:
 *   index            → CheckInHubScreen
 *   members-staff    → MembersStaffCheckInScreen
 *   walk-in/         → WalkInHubScreen (index)
 *     walk-in/register  → WalkInRegistrationScreen
 *     walk-in/visitors  → DailyVisitorsScreen
 */
export default function CheckInStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="members-staff" />
      <Stack.Screen name="walk-in" />
    </Stack>
  );
}

