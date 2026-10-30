import { StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

const DIVIDER = 'rgba(15,23,42,0.07)';

export const styles = StyleSheet.create({
  loaderContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: TypographyScale.body,
    textAlign: 'center',
  },
  content: {
    gap: Spacing.four,
  },
  summaryCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  receiptNo: {
    flexShrink: 1,
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: TypographyScale.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryLabel: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  summaryMetaText: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: TypographyScale.caption,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    flexShrink: 0,
    maxWidth: '45%',
  },
  rowValue: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  totalLabel: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  totalValue: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    marginTop: Spacing.one,
  },
  balanceLabel: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  balanceValue: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
  },
  downloadButtonPressed: {
    opacity: 0.85,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: TypographyScale.body,
    fontWeight: '700',
  },
});
