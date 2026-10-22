import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
  useSitemap,
  type Href,
  type SitemapType,
} from 'expo-router';
import { useEffect, useMemo } from 'react';

import { i18n, useLanguageStore } from '@/core/i18n';
import { Loader } from '@/shared/components';
import { APP_ROLES, type AppRole } from '../../domain/valueObjects/AppRole';
import { ROLE_SELECTION_HREF, MEMBER_AUTH_HREF, getRoleHomeHref } from '../navigation/routes';

import type { createUseRestoreSession } from '../hooks/useAuthFlow';

const LANGUAGE_SELECT_ROUTE = '(auth)/language-select';
/**
 * Member home with the referral-code sheet open — where a new member lands. They're
 * only sent on to gym discovery once a code is applied (see MemberDashboardScreen).
 */
const POST_ONBOARDING_HREF = '/(member)?claimReferral=1';

const languageSelectHref = (next: string) =>
  `/(auth)/language-select?next=${encodeURIComponent(next)}` as Href;

const ROLE_GROUPS = APP_ROLES.map((role) => `(${role})`);

function collectRouteKeys(node: SitemapType | null, keys = new Set<string>()): Set<string> {
  if (!node) return keys;
  // './(member)/team/[staffId].tsx' -> '(member)/team/[staffId]'
  keys.add(node.contextKey.replace(/^\.\//, '').replace(/\.[jt]sx?$/, ''));
  node.children.forEach((child) => collectRouteKeys(child, keys));
  return keys;
}

/**
 * Route groups don't appear in URLs, so `/profile`, `/community`, `/` … exist under
 * every role group and a cold load (web reload, or the OS restoring the app after it
 * was killed while idle) resolves them to the first group — `(admin)`. A member then
 * sits inside the admin tab shell and lands on the admin dashboard when backing out.
 * Returns the same screen inside the user's own group (or their home if that group
 * has no such screen), or null when the URL already belongs to their role.
 */
function wrongRoleGroupHref(
  segments: string[],
  appRole: AppRole,
  routeKeys: Set<string>,
  params: Record<string, string | string[] | undefined>,
): Href | null {
  const group = segments[0];
  const ownGroup = `(${appRole})`;
  if (!ROLE_GROUPS.includes(group) || group === ownGroup) return null;

  const rest = segments.slice(1);
  const pattern = [ownGroup, ...rest].join('/');
  if (routeKeys.has(pattern) || routeKeys.has(`${pattern}/index`)) {
    return { pathname: `/${pattern}`, params } as Href;
  }
  return getRoleHomeHref(appRole);
}

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
  const params = useGlobalSearchParams();
  const router = useRouter();
  const sitemap = useSitemap();
  const routeKeys = useMemo(() => collectRouteKeys(sitemap), [sitemap]);

  const appRole = isAuthenticated ? session?.appRole : undefined;
  const roleRedirect = useMemo(
    () => (appRole ? wrongRoleGroupHref(segments, appRole, routeKeys, params) : null),
    [appRole, segments, routeKeys, params],
  );

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
      if (roleRedirect) {
        router.replace(roleRedirect);
        return;
      }
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
    roleRedirect,
  ]);

  if (!isHydrated || isRestoring || !isLanguageHydrated) {
    return <Loader message={i18n.t('auth.loading')} />;
  }

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'role-selection';

  // Don't mount another role's layout (and fire its 403'd requests) while redirecting.
  if ((!isAuthenticated && !inAuthGroup && segments.length > 0) || roleRedirect) {
    return <Loader message={i18n.t('auth.redirecting')} />;
  }

  return children;
}

export function createAuthBootstrap(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AuthBootstrapContainer({ children }: { children: React.ReactNode }) {
    return <AuthBootstrap useRestoreSession={useRestoreSession}>{children}</AuthBootstrap>;
  };
}
