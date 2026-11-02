import { Stack } from 'expo-router';

/** Only the New Member form lives here — staff and trainers open it from their dashboard. */
export default function MembersStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
    </Stack>
  );
}
