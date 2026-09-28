import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import type * as GoogleSigninModule from '@react-native-google-signin/google-signin';

import { analytics } from '@/core/platform/analytics';
import { env } from '@/core/platform/config';
import { toast } from '@/shared/components/Toasts/toastStore';

import type { AuthOrchestrator } from '../../application/orchestrators/AuthOrchestrator';
import type { CompleteSocialRegistrationDto } from '../../application/useCases/CompleteSocialRegistration';
import type { GetPendingSocialRegistration } from '../../application/useCases/GetPendingSocialRegistration';
import type { LinkProviderDto } from '../../application/useCases/LinkProvider';
import type { PendingSocialRegistration } from '../../domain/entities/PendingSocialRegistration';
import type { Session } from '../../domain/entities/Session';
import type { SocialAuthOutcome, SocialProvider } from '../../domain/entities/SocialAuthOutcome';
import { useAuthStore } from '../../store/authStore';
import { MEMBER_AUTH_HREF, SOCIAL_USERNAME_HREF } from '../navigation/routes';

/** Thrown from a mutationFn to signal "user cancelled" — distinct from a real failure, so onError can ignore it silently. */
class SocialSignInCancelledError extends Error {}

// Loaded lazily: RNGoogleSignin is a native module that doesn't exist in Expo
// Go (or in a dev build made before it was added), and a top-level import
// throws at module-eval time, crashing every screen that touches the auth barrel.
function loadGoogleSignin(): typeof GoogleSigninModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as typeof GoogleSigninModule;
  } catch {
    return null;
  }
}

const googleSignin = loadGoogleSignin();

/** Google sign-in needs both the native module and a configured web client ID. */
const isGoogleAvailable = googleSignin !== null && !!env.googleWebClientId;

let googleConfigured = false;
function ensureGoogleConfigured(google: typeof GoogleSigninModule) {
  if (googleConfigured) return;
  google.GoogleSignin.configure({
    webClientId: env.googleWebClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
  });
  googleConfigured = true;
}

async function handleSocialOutcome(
  outcome: SocialAuthOutcome,
  provider: SocialProvider,
  deps: {
    router: ReturnType<typeof useRouter>;
    setSession: (session: Session) => void;
  }
): Promise<void> {
  if (outcome.kind === 'authenticated') {
    deps.setSession(outcome.session);

    // Same tenant-restore step createUseLogin/createUseVerifyOtp perform after
    // establishing a session — a global member's JWT carries no tenant claim.
    try {
      await useAuthStore.getState().restoreActiveTenantForUser(outcome.session.user.id);
    } catch (e) {
      console.error('Failed to restore active tenant', e);
    }

    analytics.track({
      name: 'auth_social_signin_success',
      properties: { provider, userId: outcome.session.user.id },
    });
    analytics.identify(outcome.session.user.id);

    // No manual navigation — setSession() flips isAuthenticated, and
    // AuthBootstrap's existing effect routes to profile-completion for a
    // fresh account or straight to role home for a returning one, the same
    // way it already does post-login/post-OTP.
    return;
  }

  if (outcome.kind === 'linkRequired') {
    analytics.track({
      name: 'auth_social_link_required',
      properties: { provider },
    });
    toast.info(
      `An account already exists for ${outcome.maskedEmail}. Sign in with your existing method, then link ${
        provider === 'GOOGLE' ? 'Google' : 'Apple'
      } from there.`,
      { title: 'Account already exists', duration: 9000 }
    );
    deps.router.replace(MEMBER_AUTH_HREF);
    return;
  }

  // needsUsername — AuthRepositoryImpl already persisted the pending handle.
  analytics.track({
    name: 'auth_social_needs_username',
    properties: { provider },
  });
  deps.router.push(SOCIAL_USERNAME_HREF);
}

export function createUseGoogleSignIn(authOrchestrator: AuthOrchestrator) {
  return function useGoogleSignIn() {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: async (): Promise<SocialAuthOutcome> => {
        if (!googleSignin || !isGoogleAvailable) {
          throw new Error('Google sign-in is not available in this build.');
        }
        const { GoogleSignin, isCancelledResponse, isSuccessResponse } = googleSignin;
        ensureGoogleConfigured(googleSignin);
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        const response = await GoogleSignin.signIn();

        if (isCancelledResponse(response)) {
          throw new SocialSignInCancelledError();
        }
        if (!isSuccessResponse(response) || !response.data.idToken) {
          throw new Error('Google did not return a valid credential.');
        }

        const result = await authOrchestrator.signInWithGoogle(response.data.idToken);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.value;
      },
      onSuccess: async (outcome) => {
        setErrorMessage(undefined);
        await handleSocialOutcome(outcome, 'GOOGLE', { router, setSession });
      },
      onError: (error: unknown) => {
        if (error instanceof SocialSignInCancelledError) return;
        if (googleSignin?.isErrorWithCode(error) && error.code === googleSignin.statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        analytics.track({
          name: 'auth_social_signin_failed',
          properties: { provider: 'GOOGLE' },
        });
        setErrorMessage(error instanceof Error ? error.message : 'Unable to continue with Google. Please try again.');
      },
    });

    return {
      signInWithGoogle: () => mutation.mutate(),
      isLoading: mutation.isPending,
      errorMessage,
      isAvailable: isGoogleAvailable,
    };
  };
}

function composeAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined
): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(' ') : null;
}

function isAppleCancelledError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ERR_REQUEST_CANCELED';
}

export function createUseAppleSignIn(authOrchestrator: AuthOrchestrator) {
  return function useAppleSignIn() {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: async (): Promise<SocialAuthOutcome> => {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error('Apple did not return a valid credential.');
        }

        // Advisory only, and only present at all on the user's very first
        // authorization ever — never trusted as identity, only passed through
        // as a pre-fill hint (see AuthenticateWithAppleDto).
        const fullNameHint = composeAppleFullName(credential.fullName);

        const result = await authOrchestrator.signInWithApple({
          identityToken: credential.identityToken,
          fullNameHint,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.value;
      },
      onSuccess: async (outcome) => {
        setErrorMessage(undefined);
        await handleSocialOutcome(outcome, 'APPLE', { router, setSession });
      },
      onError: (error: unknown) => {
        if (isAppleCancelledError(error)) return;
        analytics.track({
          name: 'auth_social_signin_failed',
          properties: { provider: 'APPLE' },
        });
        setErrorMessage(error instanceof Error ? error.message : 'Unable to continue with Apple. Please try again.');
      },
    });

    return {
      signInWithApple: () => mutation.mutate(),
      isLoading: mutation.isPending,
      errorMessage,
      // Sign in with Apple is iOS-only, both by platform capability and App
      // Store review guidelines when a Google button is also present.
      isAvailable: Platform.OS === 'ios',
    };
  };
}

export function createUseCompleteSocialRegistration(authOrchestrator: AuthOrchestrator) {
  return function useCompleteSocialRegistration() {
    const setSession = useAuthStore((state) => state.setSession);
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (input: CompleteSocialRegistrationDto) => authOrchestrator.completeSocialSignUp(input),
      onSuccess: async (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          analytics.track({ name: 'auth_complete_social_registration_failed' });
          return;
        }

        setErrorMessage(undefined);
        setSession(result.value);

        try {
          await useAuthStore.getState().restoreActiveTenantForUser(result.value.user.id);
        } catch (e) {
          console.error('Failed to restore active tenant', e);
        }

        analytics.track({
          name: 'auth_complete_social_registration_success',
          properties: { userId: result.value.user.id },
        });
        analytics.identify(result.value.user.id);

        // No manual navigation — AuthBootstrap reacts to the new session the
        // same way it does post-OTP.
      },
    });

    return {
      completeRegistration: mutation.mutate,
      isCompleting: mutation.isPending,
      errorMessage,
    };
  };
}

export function createUseLinkProvider(authOrchestrator: AuthOrchestrator) {
  return function useLinkProvider() {
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (input: LinkProviderDto) => authOrchestrator.linkSocialProvider(input),
      onSuccess: (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }
        setErrorMessage(undefined);
        toast.success('Account linked.');
      },
    });

    return {
      linkProvider: mutation.mutate,
      isLinking: mutation.isPending,
      errorMessage,
    };
  };
}

export function createUsePendingSocialRegistration(getPendingSocialRegistration: GetPendingSocialRegistration) {
  return function usePendingSocialRegistration() {
    const [pending, setPending] = useState<PendingSocialRegistration | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      let cancelled = false;
      getPendingSocialRegistration.execute().then((result) => {
        if (cancelled) return;
        setPending(result.success ? result.value : null);
        setIsLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, []);

    return { pending, isLoaded };
  };
}
