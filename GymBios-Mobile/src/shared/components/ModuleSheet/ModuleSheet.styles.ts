import { StyleSheet } from 'react-native';

import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },

  section: {
    gap: Spacing.three,
  },

  sectionTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    paddingHorizontal: Spacing.one,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },

  card: {
    width: '48%',
    minHeight: 130,

    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,

    padding: Spacing.three,

    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.neutral[200],
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,

    backgroundColor: BrandColors.screenBackgroundAlt,

    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    marginTop: Spacing.three,

    fontSize: TypographyScale.subtitle,
    fontWeight: '600',

    color: BrandColors.textPrimary,
  },

  cardSubtitle: {
    marginTop: Spacing.two,

    fontSize: TypographyScale.small,

    color: BrandColors.textSecondary,
    lineHeight: 18,
  },
});