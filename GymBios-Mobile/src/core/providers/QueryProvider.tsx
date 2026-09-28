import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

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
      retry: 2,
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
