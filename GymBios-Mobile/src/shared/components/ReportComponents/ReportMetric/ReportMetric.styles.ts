import { StyleSheet } from 'react-native';

import { BrandColors, Colors, Radius, Spacing, TypographyScale } from '@/core/theme';

/** Positive trend colour – green. */
export const POSITIVE_COLOR = '#16a34a';

/** Negative trend colour – red. */
export const NEGATIVE_COLOR = Colors.light.error;

/** Neutral / muted trend colour. */
export const NEUTRAL_COLOR = BrandColors.textSecondary;

export const styles = StyleSheet.create({
  /** Card surface with elevation and rounded corners. */
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,

    padding: Spacing.three,

    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },

    // Android elevation
    elevation: 2,
  },

  /** Muted label above the value. */
  label: {
    fontSize: TypographyScale.small,
    fontWeight: '500',
    color: BrandColors.textSecondary,
    marginBottom: Spacing.one,
  },

  /** Large, prominent metric value. */
  value: {
    fontSize: TypographyScale.display,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    letterSpacing: -0.5,
  },

  /** Row wrapping the change indicator arrow and text. */
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },

  /** Change text – colour applied inline from changeType. */
  changeText: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
  },
});


// ReportMetric.styles.ts — add tone variants
export const toneStyles = StyleSheet.create({
  teal: {
    backgroundColor: BrandColors.teal,
  },
  amber: {
    backgroundColor: BrandColors.trainerAmber,
  },
});

export const toneTextStyles = StyleSheet.create({
  onColor: {
    color: 'rgba(255,255,255,0.85)',
  },
  onColorValue: {
    color: '#FFFFFF',
  },
});