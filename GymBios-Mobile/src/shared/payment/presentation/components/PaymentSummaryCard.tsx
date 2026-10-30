import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useTranslation } from 'react-i18next';

interface PaymentSummaryCardProps {
  title: string;
  subtitle?: string;
  amount: number;
}

/** The "amount due" hero at the top of the payment sheet. */
export function PaymentSummaryCard({
  title,
  subtitle,
  amount,
}: PaymentSummaryCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
      <View style={styles.textGroup}>
        <Typography variant="caption" style={{ color: theme.textSecondary }}>
          {t('paymentSheet.amountDue')}
        </Typography>
        <Typography variant="bodySmallBold" style={{ color: theme.text }} numberOfLines={2}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <Typography variant="subtitle" style={[styles.amount, { color: theme.primary }]}>
        <CurrencyValue amount={amount} decimals={2} />
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three + Spacing.one,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
