import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Fonts, type ThemeColor } from '@/core/theme';

export type TypographyVariant =
  | 'body'
  | 'bodySmall'
  | 'bodySmallBold'
  | 'title'
  | 'subtitle'
  | 'caption'
  | 'link'
  | 'code';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: ThemeColor;
}

export function Typography({ style, variant = 'body', color = 'text', ...rest }: TypographyProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[color] },
        variant === 'body' && styles.body,
        variant === 'bodySmall' && styles.bodySmall,
        variant === 'bodySmallBold' && styles.bodySmallBold,
        variant === 'title' && styles.title,
        variant === 'subtitle' && styles.subtitle,
        variant === 'caption' && styles.caption,
        variant === 'link' && styles.link,
        variant === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bodySmallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
    lineHeight: 16,
  },
});
