import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing, type ThemeColor } from '@/core/theme';

export interface SurfaceProps extends ViewProps {
  background?: ThemeColor;
}

export function Surface({ style, background = 'background', ...rest }: SurfaceProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[background] }, style]} {...rest} />;
}

export function Card({ style, ...rest }: SurfaceProps) {
  return (
    <Surface
      background="backgroundElement"
      style={[{ borderRadius: Radius.lg, padding: Spacing.four }, style]}
      {...rest}
    />
  );
}

export function Divider({ style, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }, style]}
      {...rest}
    />
  );
}
