import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError } from '@/core/platform/api/types';

// React Native has no window focus event, so refetchOnWindowFocus is a no-op
// unless the app's foreground state is fed to TanStack Query.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });
    return () => subscription.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx (403 access locked, 404, validation) won't change on retry — retrying it
      // only repeats the failure and its error toast. Timeouts/rate limits still retry.
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : 0;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
        return failureCount < 2;
      },
      staleTime: 60_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
