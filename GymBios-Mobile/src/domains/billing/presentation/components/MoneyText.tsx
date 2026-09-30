import React from 'react';

import { CurrencyValue } from '@/core/providers';
import { Typography } from '@/shared/components/Typography';

interface MoneyTextProps {
  amount: number | undefined;
  /** Typography variant for the number. Defaults to 'bodySmallBold'. */
  variant?: 'caption' | 'bodySmall' | 'bodySmallBold' | 'subtitle' | 'title';
  /** Colour override — e.g. for negative / overdue amounts. */
  color?: string;
  /** Show a +/- prefix based on sign. */
  signed?: boolean;
}

/**
 * Renders a formatted amount in the gym's display currency (web Settings page).
 * Purely presentational — no props trigger side effects.
 */
export function MoneyText({
  amount = 0,
  variant = 'bodySmallBold',
  color,
  signed = false,
}: MoneyTextProps) {
  return (
    <Typography variant={variant} style={color ? { color } : undefined}>
      <CurrencyValue
        amount={signed ? amount : Math.abs(amount)}
        signed={signed}
        options={{ decimals: 2 }}
      />
    </Typography>
  );
}
