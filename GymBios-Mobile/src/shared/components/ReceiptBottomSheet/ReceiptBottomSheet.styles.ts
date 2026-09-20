import { StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

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
    paddingBottom: Spacing.six,
  },
  headerBanner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.neutral[200],
  },
  receiptNo: {
    fontSize: TypographyScale.title,
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
  section: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.six,
  },
  sectionTitle: {
    fontSize: TypographyScale.caption,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.neutral[200],
  },
  rowLabel: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.four,
    borderTopWidth: 2,
    borderTopColor: BrandColors.neutral[200],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
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
  grandTotalLabel: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: Spacing.two,
  },
  grandTotalValue: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  actionBar: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: BrandColors.neutral[200],
    backgroundColor: BrandColors.surface,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: TypographyScale.body,
    fontWeight: '600',
    marginLeft: Spacing.two,
  },
});
