import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { Fonts } from '@/core/theme';

import { QueryProvider } from './QueryProvider';
import { CurrencyProvider } from './CurrencyProvider';
import { NetworkGuard } from '@/shared/components/NetworkGuard';

type NavigationTheme = typeof DefaultTheme;

// Point react-navigation's headers/titles at the app font (web keeps its CSS font stack).
function withAppFont(theme: NavigationTheme): NavigationTheme {
  if (Platform.OS === 'web') return theme;
  const fontFamily = Fonts.sans;
  return {
    ...theme,
    fonts: {
      regular: { ...theme.fonts.regular, fontFamily },
      medium: { ...theme.fonts.medium, fontFamily },
      bold: { ...theme.fonts.bold, fontFamily },
      heavy: { ...theme.fonts.heavy, fontFamily },
    },
  };
}

const LightNavigationTheme = withAppFont(DefaultTheme);
const DarkNavigationTheme = withAppFont(DarkTheme);

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <CurrencyProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
          <NetworkGuard>
            {children}
          </NetworkGuard>
        </NavigationThemeProvider>
      </CurrencyProvider>
    </QueryProvider>
  );
}

