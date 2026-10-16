import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { useLanguageStore } from '@/core/i18n';

import { getRoleHomeHref, MEMBER_AUTH_HREF } from '../navigation/routes';
import { SplashScreen } from './SplashScreen';
import type { createUseRestoreSession } from '../hooks/useAuthFlow';

export function createSplashRoute(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function SplashRoute() {
    const router = useRouter();
    const { session } = useRestoreSession();
    const consumeResumeHref = useLanguageStore((s) => s.consumeResumeHref);

    const handleComplete = useCallback(() => {
      if (session) {
        // After the reload that a language direction change triggers, return to
        // where the user was (e.g. gym discovery with the referral sheet).
        const resumeHref = consumeResumeHref();
        router.replace(resumeHref ? (resumeHref as Href) : getRoleHomeHref(session.appRole));
        return;
      }

      router.replace(MEMBER_AUTH_HREF);
    }, [router, session, consumeResumeHref]);

    return <SplashScreen onComplete={handleComplete} />;
  };
}
