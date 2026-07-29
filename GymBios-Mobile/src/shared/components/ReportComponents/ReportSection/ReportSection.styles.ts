import { StyleSheet } from 'react-native';

import { BrandColors, Spacing, TypographyScale } from '@/core/theme';

export const styles = StyleSheet.create({
  /** Outer wrapper that provides vertical rhythm between sections. */
  container: {
    marginBottom: Spacing.four,
  },

  /** Bold section heading. */
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },

  /**
   * Hairline divider rendered below the title.
   * Uses StyleSheet.hairlineWidth so it looks crisp on all pixel densities.
   */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.10)',
    marginBottom: Spacing.three,
  },

  /** Wrapper for the slotted children. */
  content: {
    gap: Spacing.two,
  },
});
