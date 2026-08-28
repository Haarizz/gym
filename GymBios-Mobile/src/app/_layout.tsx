import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

import { AppProviders } from '@/core/providers';
import { AuthBootstrap } from '@/domains/auth';

LogBox.ignoreLogs(['Invalid DOM property `transform-origin`']);

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthBootstrap>
    </AppProviders>
  );
}
