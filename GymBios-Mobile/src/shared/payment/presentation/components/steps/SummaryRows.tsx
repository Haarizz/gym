import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export interface SummaryRow {
  label: string;
  amount: number;
  /** Highlight the row that's charged right now. */
  emphasis?: boolean;
}

/** Dashed receipt-style rows: how the total splits up. */
export function SummaryRows({ rows }: { rows: SummaryRow[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[
            styles.row,
            index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border, borderStyle: 'dashed' },
          ]}
        >
          <Typography variant="bodySmall" style={{ color: theme.textSecondary }}>
            {row.label}
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={[styles.amount, { color: row.emphasis ? theme.primary : theme.text }, row.emphasis && styles.emphasis]}
          >
            <CurrencyValue amount={row.amount} decimals={2} />
          </Typography>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  emphasis: {
    fontSize: 16,
  },
});
