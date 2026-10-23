import { Stack } from 'expo-router';

// Keep the centers list under a center's page even when that page is opened
// directly (web reload, deep link), so going back lands on the list.
export const unstable_settings = {
  anchor: 'index',
};

export default function CentersStack() {
  // A center's page slides in from the side on both platforms (Android's default
  // is a fade-up). Web stacks don't animate; CenterDetailScreen handles that itself.
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
