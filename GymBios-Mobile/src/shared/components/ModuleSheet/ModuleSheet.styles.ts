import { StyleSheet } from 'react-native';

import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export const styles = StyleSheet.create({
  container: {
    // Basic container style if needed
  },

  // Level 1: List
  listViewContainer: {
    paddingBottom: Spacing.four,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.neutral[200],
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  listIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '500',
    color: BrandColors.textPrimary,
  },

  // Level 2: Submodules
  submoduleViewContainer: {
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  closeButton: {
    padding: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.two,
  },
  gridItem: {
    width: '33.33%',
    alignItems: 'center',
    padding: Spacing.two,
    gap: Spacing.two,
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemTitle: {
    fontSize: TypographyScale.small,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
});