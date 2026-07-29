import { StyleSheet } from 'react-native';

import {
  BrandColors,
  Radius,
  Spacing,
  TypographyScale,
} from '@/core/theme';

export const styles = StyleSheet.create({
  button: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },

  label: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.teal,
  },
});