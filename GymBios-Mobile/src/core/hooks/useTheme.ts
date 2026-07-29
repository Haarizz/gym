import { Colors } from '@/core/theme';
import { useColorScheme } from '@/core/hooks/useColorScheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme ?? 'light';

  return Colors[theme];
}

export function useColorSchemeName() {
  const scheme = useColorScheme();
  return scheme ?? 'light';
}