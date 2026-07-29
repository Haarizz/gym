import { StyleSheet } from 'react-native';

import { BrandColors, Spacing, TypographyScale } from '@/core/theme';

export const styles = StyleSheet.create({
  /** Outer touchable / view wrapper for the row. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },

  /** Left section that takes up remaining horizontal space. */
  info: {
    flex: 1,
  },

  /** Primary row label. */
  title: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },

  /** Optional secondary detail below the title. */
  subtitle: {
    fontSize: TypographyScale.small,
    fontWeight: '400',
    color: BrandColors.textSecondary,
    marginTop: 2,
  },

  /** Optional trailing value aligned to the row's right edge. */
  value: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    textAlign: 'right',
  },

  /** Hairline divider at the bottom of each row. */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
