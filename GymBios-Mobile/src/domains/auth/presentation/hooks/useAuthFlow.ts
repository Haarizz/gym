import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { analytics } from '@/core/platform/analytics';

import type { AuthOrchestrator } from '../../application/orchestrators/AuthOrchestrator';
import type { RestoreSession } from '../../application/useCases/RestoreSession';
import type { AppRole } from '../../domain/valueObjects/AppRole';
import { useAuthStore } from '../../store/authStore';
import type { LoginFormValues } from '../forms/LoginForm';
import { getRoleHomeHref, MEMBER_AUTH_HREF, ROLE_LOGIN_HREF, ROLE_SELECTION_HREF } from '../navigation/routes';

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
      onSuccess: (result) => {
        if (!result.success) {
          setErrorMessage(result.error);
          analytics.track({ name: 'auth_login_failed', properties: { role } });
          return;
        }

        setErrorMessage(undefined);
        setSession(result.value);
        analytics.track({
          name: 'auth_login_success',
          properties: { userId: result.value.user.id, role: result.value.appRole },
        });
        analytics.identify(result.value.user.id);
        router.replace(getRoleHomeHref(result.value.appRole));
      },
    });

    return {
      login: mutation.mutate,
      isLoading: mutation.isPending,
      errorMessage,
    };
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
      onSuccess: (result) => {
        if (result.success && result.value) {
          setSession(result.value.session);
          if (result.value.pendingRole) {
            setPendingRole(result.value.pendingRole);
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
