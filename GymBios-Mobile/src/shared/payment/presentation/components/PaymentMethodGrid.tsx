import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { PaymentMethodOption } from '@/shared/payment/constants';
import type { PayerMode, PaymentMethod } from '@/shared/payment/types';
import { PaymentMethodCard } from './PaymentMethodCard';

interface PaymentMethodGridProps {
  options: PaymentMethodOption[];
  payer: PayerMode;
  /** Per-method reason a tile is disabled (no Stripe key, UPI outside INR, ...). */
  unavailable: Partial<Record<PaymentMethod, string>>;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentMethodGrid({
  options,
  payer,
  unavailable,
  onSelectMethod,
}: PaymentMethodGridProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Two tiles per row, like a native checkout.
  const rows: PaymentMethodOption[][] = [];
  for (let i = 0; i < options.length; i += 2) rows.push(options.slice(i, i + 2));

  const subtitleFor = (id: PaymentMethod) =>
    id === 'cash'
      ? t(payer === 'staff' ? 'paymentSheet.methods.cash.subtitleStaff' : 'paymentSheet.methods.cash.subtitleMember')
      : t(`paymentSheet.methods.${id}.subtitle`);

  return (
    <View style={styles.container}>
      <Typography variant="bodySmallBold" style={[styles.heading, { color: theme.textSecondary }]}>
        {t(payer === 'staff' ? 'paymentSheet.howToPayStaff' : 'paymentSheet.howToPay')}
      </Typography>
      {rows.map((row) => (
        <View key={row.map((o) => o.id).join('-')} style={styles.row}>
          {row.map((option) => (
            <PaymentMethodCard
              key={option.id}
              option={option}
              title={t(`paymentSheet.methods.${option.id}.title`)}
              subtitle={subtitleFor(option.id)}
              unavailableReason={unavailable[option.id]}
              onSelect={() => onSelectMethod(option.id)}
            />
          ))}
          {row.length === 1 ? <View style={styles.filler} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two + 2,
  },
  heading: {
    marginStart: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  filler: {
    flex: 1,
  },
});
