import { StyleSheet } from 'react-native';

import {
  BrandColors,
  Radius,
  Spacing,
  TypographyScale,
} from '@/core/theme';

export const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.neutral[200],
  },

  noDivider: {
    borderBottomWidth: 0,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  left: {
    flex: 1,
    marginRight: Spacing.three,
  },

  title: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
  },

  right: {
    alignItems: 'flex-end',
  },

  value: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },

  trend: {
    marginTop: 2,
    fontSize: TypographyScale.small,
    color: BrandColors.teal,
  },
});