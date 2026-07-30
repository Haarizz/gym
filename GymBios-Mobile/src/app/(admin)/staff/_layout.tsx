import { Stack } from 'expo-router';

export default function StaffStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="create"
        options={{
          tabBarStyle: { display: 'none' },
        } as any}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          tabBarStyle: { display: 'none' },
        } as any}
      />
    </Stack>
  );
}
