import { StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';

export const dropdownStyles = StyleSheet.create({
  label: {
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  valueText: {
    flex: 1,
  },
  error: {
    marginTop: Spacing.one,
  },
  // ── Bottom-sheet option rows ──────────────────────────────────────────────
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.neutral[200],
  },
  optionLabel: {
    flex: 1,
  },
});
