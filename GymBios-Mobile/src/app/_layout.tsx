import { Stack } from 'expo-router';

import { AppProviders } from '@/core/providers';
import { AuthBootstrap } from '@/domains/auth';

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthBootstrap>
    </AppProviders>
  );
}
