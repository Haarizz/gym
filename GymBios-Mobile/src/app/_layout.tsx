import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

import { AppProviders } from '@/core/providers';
import { AuthBootstrap } from '@/domains/auth';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isCommunityRoute, isFullScreenRoute } from '@/domains/auth/presentation/navigation/layoutRoutes';
import { ToastProvider } from '@/shared/components/Toasts/ToastProvider';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';

LogBox.ignoreLogs(['Invalid DOM property `transform-origin`']);

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <RootLayoutContent />
      </AuthBootstrap>
    </AppProviders>
  );
}

function RootLayoutContent() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  
  const isTabBarHidden = isFullScreenRoute(segments) || isCommunityRoute(segments);
  const bottomOffset = insets.bottom + (isTabBarHidden ? 0 : TAB_BAR_HEIGHT);

  return (
    <ToastProvider bottomOffset={bottomOffset}>
      <Stack screenOptions={{ headerShown: false }} />
    </ToastProvider>
  );
}
