import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { MoneyText } from './MoneyText';

interface PaymentSummaryRow {
  label: string;
  amount: number;
  bold?: boolean;
  color?: string;
}

interface PaymentSummaryCardProps {
  rows: PaymentSummaryRow[];
  title?: string;
}

/**
 * Breakdown of amounts in the payment settlement confirmation screen.
 * Purely presentational.
 */
export function PaymentSummaryCard({ rows, title = 'Payment Summary' }: PaymentSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Typography variant="bodySmallBold" style={styles.title}>
        {title}
      </Typography>

      {rows.map((row, index) => (
        <View
          key={index}
          style={[styles.row, index === rows.length - 1 && styles.rowLast]}
        >
          <Typography
            variant={row.bold ? 'bodySmallBold' : 'bodySmall'}
            color="textSecondary"
            style={row.bold ? styles.boldLabel : undefined}
          >
            {row.label}
          </Typography>
          <MoneyText
            amount={row.amount}
            variant={row.bold ? 'bodySmallBold' : 'bodySmall'}
            color={row.color}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  boldLabel: {
    color: BrandColors.textPrimary,
  },
});
