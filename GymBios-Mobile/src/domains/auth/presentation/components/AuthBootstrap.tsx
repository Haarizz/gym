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
  const { restore, isHydrated, isRestoring, isAuthenticated, session } = useRestoreSession();

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
    const isProfileCompletion = segments.join('/') === '(auth)/profile-completion';
    // Check both session-level and user-level profileCompleted for consistency
    const profileCompleted = session?.profileCompleted ?? session?.user.profileCompleted ?? false;

    if (isAuthenticated) {
      if (session?.appRole === 'member') {
        if (!profileCompleted && !isProfileCompletion) {
          // Profile incomplete → send to profile completion
          router.replace('/(auth)/profile-completion');
        } else if (profileCompleted && isProfileCompletion) {
          // Profile just completed while still on profile-completion screen → go home
          router.replace('/(member)');
        }
      }
    } else if (!inAuthGroup && segments.length > 0) {
      router.replace(ROLE_SELECTION_HREF);
    }
  }, [isHydrated, isRestoring, isAuthenticated, session, segments, router]);

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
