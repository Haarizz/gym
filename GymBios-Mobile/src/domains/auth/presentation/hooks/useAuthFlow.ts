import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { analytics } from '@/core/platform/analytics';
import { toast } from '@/shared/components/Toasts/toastStore';

import type { AuthOrchestrator } from '../../application/orchestrators/AuthOrchestrator';
import type { GetPendingRegistration } from '../../application/useCases/GetPendingRegistration';
import type { RegisterUserDto } from '../../application/useCases/RegisterUser';
import type { RestoreSession } from '../../application/useCases/RestoreSession';
import type { VerifyOtpDto } from '../../application/useCases/VerifyOtp';
import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { AppRole } from '../../domain/valueObjects/AppRole';
import { useAuthStore } from '../../store/authStore';
import type { LoginFormValues } from '../forms/LoginForm';
import { getRoleHomeHref, MEMBER_AUTH_HREF, ROLE_LOGIN_HREF, ROLE_SELECTION_HREF, VERIFY_EMAIL_HREF } from '../navigation/routes';

export function createUseSelectAppRole(authOrchestrator: AuthOrchestrator) {
  return function useSelectAppRole() {
    const router = useRouter();
    const setPendingRole = useAuthStore((state) => state.setPendingRole);

    const mutation = useMutation({
      mutationFn: (role: AppRole) => authOrchestrator.chooseRole({ role }),
      onSuccess: (result, role) => {
        if (!result.success) {
          return;
        }

        setPendingRole(role);
        router.push(ROLE_LOGIN_HREF);
      },
    });

    return {
      selectRole: mutation.mutate,
      isSelecting: mutation.isPending,
      error: mutation.data && !mutation.data.success ? mutation.data.error : undefined,
    };
  };
}

export function createUseLogin(authOrchestrator: AuthOrchestrator) {
  return function useLogin(role: AppRole) {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (values: LoginFormValues) =>
        authOrchestrator.signIn({
          username: values.username,
          password: values.password,
          role,
        }),
      onSuccess: async (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          analytics.track({ name: 'auth_login_failed', properties: { role } });
          return;
        }

        setErrorMessage(undefined);
        setSession(result.value);

        // A global member's JWT carries no tenant claim (they may join gyms after
        // the fact, and could belong to more than one) — X-Tenant-ID, sourced from
        // this locally persisted value, is the only thing that routes their
        // requests to the right tenant database. Restore it here the same way
        // session-restore does, so a fresh login (not just resuming an existing
        // session) also re-establishes it. Scoped to this user's id, so a stale
        // tenant left behind by a different account on this device is dropped
        // rather than inherited.
        try {
          await useAuthStore.getState().restoreActiveTenantForUser(result.value.user.id);
        } catch (e) {
          console.error('Failed to restore active tenant', e);
        }

        analytics.track({
          name: 'auth_login_success',
          properties: { userId: result.value.user.id, role: result.value.appRole },
        });
        analytics.identify(result.value.user.id);
        
        const pending = useAuthStore.getState().pendingDeepLinkIntent;
        if (pending && pending.type === 'catalog-branch') {
          useAuthStore.getState().setPendingDeepLinkIntent(null);
          router.replace(`/catalog/t/${pending.tenantSlug}/b/${pending.branchId}`);
        } else {
          router.replace(getRoleHomeHref(result.value.appRole));
        }
      },
    });

    return {
      login: mutation.mutate,
      isLoading: mutation.isPending,
      errorMessage,
    };
  };
}

export function createUseRegister(authOrchestrator: AuthOrchestrator) {
  return function useRegister() {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (values: RegisterUserDto) =>
        authOrchestrator.register(values),
      onSuccess: (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          analytics.track({ name: 'auth_register_failed' });
          return;
        }

        setErrorMessage(undefined);
        analytics.track({ name: 'auth_register_initiated' });

        // TEMPORARY: until real email delivery is wired in, the backend
        // returns the raw OTP and we show it via toast instead of it landing
        // in an inbox. Remove this block once EmailService is connected.
        if (result.value.devOtp) {
          toast.info(`Your verification code is ${result.value.devOtp}`, {
            title: 'Dev mode — OTP (no email sent yet)',
            duration: 12000,
          });
        }

        // No session exists yet — registration only creates a pending,
        // unverified registration. Navigate to Email Verification explicitly
        // (there's no session for AuthBootstrap to react to at this point).
        router.push({
          pathname: VERIFY_EMAIL_HREF as any,
          params: {
            registrationToken: result.value.registrationToken,
            maskedEmail: result.value.maskedEmail,
            otpExpiresAt: result.value.otpExpiresAt,
            resendAvailableAt: result.value.resendAvailableAt,
          },
        });
      },
    });

    return {
      register: mutation.mutate,
      isLoading: mutation.isPending,
      errorMessage,
    };
  };
}

export function createUseVerifyOtp(authOrchestrator: AuthOrchestrator) {
  return function useVerifyOtp() {
    const setSession = useAuthStore((state) => state.setSession);
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (input: VerifyOtpDto) => authOrchestrator.confirmOtp(input),
      onSuccess: async (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          analytics.track({ name: 'auth_verify_otp_failed' });
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
          name: 'auth_verify_otp_success',
          properties: { userId: result.value.user.id },
        });
        analytics.identify(result.value.user.id);

        // No manual navigation — setSession() flips isAuthenticated, and
        // AuthBootstrap's existing effect routes to profile-completion, the
        // same way it already does right after login/register (see its
        // "no manual navigation here" comment on ProfileCompletionScreen).
      },
    });

    return {
      verifyOtp: mutation.mutate,
      isVerifying: mutation.isPending,
      errorMessage,
    };
  };
}

export function createUseResendOtp(authOrchestrator: AuthOrchestrator) {
  return function useResendOtp() {
    const [errorMessage, setErrorMessage] = useState<string>();

    const mutation = useMutation({
      mutationFn: (registrationToken: string) => authOrchestrator.resendVerificationOtp(registrationToken),
      onSuccess: (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }

        setErrorMessage(undefined);
        analytics.track({ name: 'auth_resend_otp_success' });

        // TEMPORARY — see createUseRegister's identical block.
        if (result.value.devOtp) {
          toast.info(`Your new verification code is ${result.value.devOtp}`, {
            title: 'Dev mode — OTP (no email sent yet)',
            duration: 12000,
          });
        } else {
          toast.success('A new code has been sent.');
        }
      },
    });

    return {
      resendOtp: mutation.mutate,
      isResending: mutation.isPending,
      resendResult: mutation.data && mutation.data.success ? mutation.data.value : undefined,
      errorMessage,
    };
  };
}

export function createUsePendingRegistration(getPendingRegistration: GetPendingRegistration) {
  return function usePendingRegistration() {
    const [pending, setPending] = useState<PendingRegistration | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      let cancelled = false;
      getPendingRegistration.execute().then((result) => {
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

export function createUseRestoreSession(
  restoreSession: RestoreSession,
  authOrchestrator: AuthOrchestrator,
) {
  return function useRestoreSession() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const session = useAuthStore((state) => state.session);
    const isHydrated = useAuthStore((state) => state.isHydrated);
    const setSession = useAuthStore((state) => state.setSession);
    const setPendingRole = useAuthStore((state) => state.setPendingRole);
    const setHydrated = useAuthStore((state) => state.setHydrated);
    const reset = useAuthStore((state) => state.reset);

    const restoreMutation = useMutation({
      mutationFn: () => restoreSession.execute(),
      onSuccess: async (result) => {
        if (result.success && result.value) {
          setSession(result.value.session);
          if (result.value.pendingRole) {
            setPendingRole(result.value.pendingRole);
          }

          // Scoped to this user's id, so a stale tenant left behind by a
          // different account on this device is dropped rather than inherited.
          if (result.value.session) {
            try {
              await useAuthStore.getState().restoreActiveTenantForUser(result.value.session.user.id);
            } catch (e) {
              console.error('Failed to restore active tenant', e);
            }
          }
        }

        setHydrated(true);
      },
    });

    const logoutMutation = useMutation({
      mutationFn: async () => {
        try {
          return await authOrchestrator.signOut();
        } catch {
          return { success: true, value: undefined };
        }
      },
      onSettled: () => {
        queryClient.clear();
        reset();
        analytics.track({ name: 'auth_logout_success' });
        router.replace(MEMBER_AUTH_HREF);
      },
    });

    const restore = useCallback(() => {
      if (!isHydrated && !restoreMutation.isPending) {
        restoreMutation.mutate();
      }
    }, [isHydrated, restoreMutation]);

    return {
      session,
      isHydrated,
      isAuthenticated: session !== null,
      appRole: session?.appRole ?? null,
      restore,
      isRestoring: restoreMutation.isPending,
      logout: logoutMutation.mutate,
      isLoggingOut: logoutMutation.isPending,
    };
  };
}
