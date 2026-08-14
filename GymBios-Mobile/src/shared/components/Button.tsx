import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';

import { Typography } from './Typography';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label?: string;
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const buttonText = title ?? label ?? '';

  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'secondary'
        ? theme.backgroundElement
        : 'transparent';

  const textColor = variant === 'primary' ? theme.primaryText : theme.text;
  const borderWidth = variant === 'outline' ? 1 : 0;
  const borderColor = variant === 'outline' ? theme.border : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor, borderWidth, borderColor, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Typography
          variant="bodySmallBold"
          style={[{ color: textColor }, size === 'lg' && styles.lgText]}>
          {buttonText}
        </Typography>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  md: {
    minHeight: 48,
    borderRadius: Radius.md,
  },
  lg: {
    height: 56,
    borderRadius: Radius.lg,
  },
  lgText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
