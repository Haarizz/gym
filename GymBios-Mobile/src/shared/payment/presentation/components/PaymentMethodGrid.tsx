import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { PAYMENT_METHODS, type PaymentMethodOption } from '@/shared/payment/constants';
import type { PaymentMethod } from '@/shared/payment/types';
import { PaymentMethodCard } from './PaymentMethodCard';

interface PaymentMethodGridProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentMethodGrid({
  selectedMethod,
  onSelectMethod,
}: PaymentMethodGridProps) {
  return (
    <View style={styles.container}>
      <Typography variant="bodySmallBold" style={styles.sectionTitle}>
        Select Payment Method
      </Typography>

      <View style={styles.grid}>
        {PAYMENT_METHODS.map((option: PaymentMethodOption) => (
          <View key={option.id} style={styles.col}>
            <PaymentMethodCard
              option={option}
              isSelected={selectedMethod === option.id}
              onSelect={() => onSelectMethod(option.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  col: {
    width: '50%',
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.two,
  },
});
