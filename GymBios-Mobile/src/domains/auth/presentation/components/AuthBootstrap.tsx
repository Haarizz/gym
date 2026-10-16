import { usePathname, useSegments, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { i18n, useLanguageStore } from '@/core/i18n';
import { Loader } from '@/shared/components';
import { ROLE_SELECTION_HREF, MEMBER_AUTH_HREF } from '../navigation/routes';

import type { createUseRestoreSession } from '../hooks/useAuthFlow';

const LANGUAGE_SELECT_ROUTE = '(auth)/language-select';
/**
 * Member home with the referral-code sheet open — where a new member lands. They're
 * only sent on to gym discovery once a code is applied (see MemberDashboardScreen).
 */
const POST_ONBOARDING_HREF = '/(member)?claimReferral=1';

const languageSelectHref = (next: string) =>
  `/(auth)/language-select?next=${encodeURIComponent(next)}` as Href;

interface AuthBootstrapProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
  children: React.ReactNode;
}

export function AuthBootstrap({ useRestoreSession, children }: AuthBootstrapProps) {
  const { restore, isHydrated, isRestoring, isAuthenticated, session } = useRestoreSession();

  const isLanguageHydrated = useLanguageStore((s) => s.isHydrated);
  const hasChosenLanguage = useLanguageStore((s) => s.hasChosen);
  const hydrateLanguage = useLanguageStore((s) => s.hydrate);

  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    hydrateLanguage();
  }, [hydrateLanguage]);

  useEffect(() => {
    if (!isHydrated || isRestoring || !isLanguageHydrated) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'role-selection';
    const isProfileCompletion = segments.join('/') === '(auth)/profile-completion';
    const isLanguageSelect = segments.join('/') === LANGUAGE_SELECT_ROUTE;
    // Check both session-level and user-level profileCompleted for consistency
    const profileCompleted = session?.profileCompleted ?? session?.user.profileCompleted ?? false;

    if (isAuthenticated) {
      if (session?.appRole === 'member') {
        if (!profileCompleted && !isProfileCompletion) {
          // Profile incomplete → send to profile completion
          router.replace('/(auth)/profile-completion');
          return;
        } else if (profileCompleted && isProfileCompletion) {
          // Profile just completed while still on profile-completion screen → language
          // choice (if not made yet), then home with the referral-code sheet open
          router.replace(
            hasChosenLanguage ? (POST_ONBOARDING_HREF as Href) : languageSelectHref(POST_ONBOARDING_HREF),
          );
          return;
        }
      }
      // Any role, first sign-in on this device: pick a language before using the app.
      // Members with an incomplete profile finish it first (handled above).
      if (!hasChosenLanguage && !inAuthGroup && !isLanguageSelect && segments.length > 0) {
        router.replace(languageSelectHref(pathname));
      }
    } else if (!inAuthGroup && segments.length > 0) {
      router.replace(MEMBER_AUTH_HREF);
    }
  }, [
    isHydrated,
    isRestoring,
    isAuthenticated,
    session,
    segments,
    pathname,
    router,
    isLanguageHydrated,
    hasChosenLanguage,
  ]);

  if (!isHydrated || isRestoring || !isLanguageHydrated) {
    return <Loader message={i18n.t('auth.loading')} />;
  }

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'role-selection';

  if (!isAuthenticated && !inAuthGroup && segments.length > 0) {
    return <Loader message={i18n.t('auth.redirecting')} />;
  }

  return children;
}

export function createAuthBootstrap(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AuthBootstrapContainer({ children }: { children: React.ReactNode }) {
    return <AuthBootstrap useRestoreSession={useRestoreSession}>{children}</AuthBootstrap>;
  };
}
