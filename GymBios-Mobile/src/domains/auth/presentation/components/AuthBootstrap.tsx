import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Loader } from '@/shared/components';

import type { createUseRestoreSession } from '../hooks/useAuthFlow';

SplashScreen.preventAutoHideAsync();

interface AuthBootstrapProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
  children: React.ReactNode;
}

export function AuthBootstrap({ useRestoreSession, children }: AuthBootstrapProps) {
  const { restore, isHydrated, isRestoring } = useRestoreSession();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  if (!isHydrated || isRestoring) {
    return <Loader message="Loading GymBios..." />;
  }

  return children;
}

export function createAuthBootstrap(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AuthBootstrapContainer({ children }: { children: React.ReactNode }) {
    return <AuthBootstrap useRestoreSession={useRestoreSession}>{children}</AuthBootstrap>;
  };
}
