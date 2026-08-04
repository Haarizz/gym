import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { MoneyText } from './MoneyText';

interface BillingSummaryCardProps {
  label: string;
  value: number;
  iconName: keyof typeof Feather.glyphMap;
  iconBg: string;
  /** Show value as percentage (e.g. collection rate). */
  isPercent?: boolean;
  /** Accent colour for the value text. */
  valueColor?: string;
}

/**
 * Dashboard stat card used in the Billing Overview summary row.
 * Purely presentational — no props trigger side effects.
 */
export function BillingSummaryCard({
  label,
  value,
  iconName,
  iconBg,
  isPercent = false,
  valueColor,
}: BillingSummaryCardProps) {
  const displayValue = isPercent
    ? `${value.toFixed(1)}%`
    : undefined;

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={18} color="#ffffff" />
      </View>

      {isPercent ? (
        <Typography
          variant="bodySmallBold"
          style={[styles.value, valueColor ? { color: valueColor } : null]}
        >
          {displayValue}
        </Typography>
      ) : (
        <MoneyText
          amount={value}
          variant="bodySmallBold"
          color={valueColor}
        />
      )}

      <Typography variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: Spacing.half,
    minWidth: 80,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  value: {
    textAlign: 'center',
  },
  label: {
    textAlign: 'center',
    lineHeight: 14,
  },
});
