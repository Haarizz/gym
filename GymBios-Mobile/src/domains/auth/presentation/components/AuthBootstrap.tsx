import { useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Loader } from '@/shared/components';
import { ROLE_SELECTION_HREF } from '../navigation/routes';

import type { createUseRestoreSession } from '../hooks/useAuthFlow';

SplashScreen.preventAutoHideAsync();

interface AuthBootstrapProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
  children: React.ReactNode;
}

export function AuthBootstrap({ useRestoreSession, children }: AuthBootstrapProps) {
  const { restore, isHydrated, isRestoring, isAuthenticated } = useRestoreSession();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || isRestoring) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'role-selection';

    if (!isAuthenticated && !inAuthGroup && segments.length > 0) {
      router.replace(ROLE_SELECTION_HREF);
    }
  }, [isHydrated, isRestoring, isAuthenticated, segments, router]);

  if (!isHydrated || isRestoring) {
    return <Loader message="Loading GymBios..." />;
  }

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'role-selection';

  if (!isAuthenticated && !inAuthGroup && segments.length > 0) {
    return <Loader message="Redirecting to login..." />;
  }

  return children;
}

export function createAuthBootstrap(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AuthBootstrapContainer({ children }: { children: React.ReactNode }) {
    return <AuthBootstrap useRestoreSession={useRestoreSession}>{children}</AuthBootstrap>;
  };
}
