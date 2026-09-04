import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { getRoleHomeHref, MEMBER_AUTH_HREF } from '../navigation/routes';
import { SplashScreen } from './SplashScreen';
import type { createUseRestoreSession } from '../hooks/useAuthFlow';

export function createSplashRoute(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function SplashRoute() {
    const router = useRouter();
    const { session } = useRestoreSession();

    const handleComplete = useCallback(() => {
      if (session) {
        router.replace(getRoleHomeHref(session.appRole));
        return;
      }

      router.replace(MEMBER_AUTH_HREF);
    }, [router, session]);

    return <SplashScreen onComplete={handleComplete} />;
  };
}
