import { Stack } from 'expo-router';

export default function MemberCommunityStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create-post"
        options={{
          tabBarStyle: { display: 'none' },
        } as any}
      />
    </Stack>
  );
}
