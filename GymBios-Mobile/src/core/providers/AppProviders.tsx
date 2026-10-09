import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { QueryProvider } from './QueryProvider';
import { CurrencyProvider } from './CurrencyProvider';
import { NetworkGuard } from '@/shared/components/NetworkGuard';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <CurrencyProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NetworkGuard>
            {children}
          </NetworkGuard>
        </NavigationThemeProvider>
      </CurrencyProvider>
    </QueryProvider>
  );
}

