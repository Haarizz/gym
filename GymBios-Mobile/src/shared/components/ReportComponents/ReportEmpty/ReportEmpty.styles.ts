import { StyleSheet } from 'react-native';

import { BrandColors, Spacing, TypographyScale } from '@/core/theme';

export const styles = StyleSheet.create({
  /** Centered wrapper filling available space. */
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },

  /**
   * Circular illustration placeholder.
   * Uses a subtle muted background so it is visible in both light and dark
   * contexts without requiring external assets.
   */
  illustration: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(50, 127, 116, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },

  /** Empty-state headline. */
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },

  /** Supporting description below the headline. */
  description: {
    fontSize: TypographyScale.body,
    fontWeight: '400',
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
