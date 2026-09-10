import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { analytics } from '@/core/platform/analytics';

import type { AuthOrchestrator } from '../../application/orchestrators/AuthOrchestrator';
import type { RegisterUserDto } from '../../application/useCases/RegisterUser';
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
        // session) also re-establishes it.
        try {
          const { secureStorage, StorageKeys } = await import('@/core/platform/storage');
          const activeTenant = await secureStorage.getItem(StorageKeys.activeTenant);
          if (activeTenant) {
            useAuthStore.getState().setActiveTenant(activeTenant);
          }
        } catch (e) {
          console.error('Failed to restore active tenant', e);
        }

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

export function createUseRegister(authOrchestrator: AuthOrchestrator) {
  return function useRegister() {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
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
        setSession(result.value);
        analytics.track({
          name: 'auth_register_success',
          properties: { userId: result.value.user.id },
        });
        analytics.identify(result.value.user.id);
        
        // Let the AuthBootstrap routing redirect them to profile-completion
      },
    });

    return {
      register: mutation.mutate,
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
      onSuccess: async (result) => {
        if (result.success && result.value) {
          setSession(result.value.session);
          if (result.value.pendingRole) {
            setPendingRole(result.value.pendingRole);
          }
        }
        
        try {
          const { secureStorage, StorageKeys } = await import('@/core/platform/storage');
          const activeTenant = await secureStorage.getItem(StorageKeys.activeTenant);
          if (activeTenant) {
            useAuthStore.getState().setActiveTenant(activeTenant);
          }
        } catch (e) {
          console.error('Failed to restore active tenant', e);
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
