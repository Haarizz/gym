import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface MoneyTextProps {
  amount: number | undefined;
  /** Currency symbol. Defaults to '₹'. */
  currency?: string;
  /** Typography variant for the number. Defaults to 'bodySmallBold'. */
  variant?: 'caption' | 'bodySmall' | 'bodySmallBold' | 'subtitle' | 'title';
  /** Colour override — e.g. for negative / overdue amounts. */
  color?: string;
  /** Show a +/- prefix based on sign. */
  signed?: boolean;
}

/**
 * Renders a formatted currency amount.
 * Purely presentational — no props trigger side effects.
 */
export function MoneyText({
  amount = 0,
  currency = '₹',
  variant = 'bodySmallBold',
  color,
  signed = false,
}: MoneyTextProps) {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const prefix = signed ? (amount < 0 ? '−' : '+') : '';
  const text = `${prefix}${currency}${formatted}`;

  return (
    <Typography
      variant={variant}
      style={color ? { color } : undefined}
      accessibilityLabel={`${currency}${formatted}`}
    >
      {text}
    </Typography>
  );
}
