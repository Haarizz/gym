import { Stack } from 'expo-router';

export default function ReferralsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="overview" />
      <Stack.Screen name="members" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="my-rewards" />
      <Stack.Screen name="reward-queue" />
      <Stack.Screen name="reward-rules" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
