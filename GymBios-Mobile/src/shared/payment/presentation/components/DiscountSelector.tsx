import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { DiscountType } from '@/shared/payment/types';

interface DiscountSelectorProps {
  discountType: DiscountType;
  discountValue: number;
  currency?: string;
  onChange: (type: DiscountType, value: number) => void;
}

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'No Discount', value: 'none' },
  { label: 'Fixed Amount', value: 'fixed' },
  { label: 'Percentage (%)', value: 'percentage' },
];

export function DiscountSelector({
  discountType,
  discountValue,
  currency = '₹',
  onChange,
}: DiscountSelectorProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={styles.title}>
        Select Discount (Optional)
      </Typography>

      <View style={styles.row}>
        <View style={styles.dropdownWrapper}>
          <Dropdown
            label="Discount Type"
            value={discountType}
            options={DISCOUNT_TYPE_OPTIONS}
            onChange={(val) => {
              const newType = val as DiscountType;
              onChange(newType, newType === 'none' ? 0 : discountValue);
            }}
          />
        </View>

        {discountType !== 'none' ? (
          <View style={styles.inputWrapper}>
            <Input
              label={
                discountType === 'percentage'
                  ? 'Discount (%)'
                  : `Amount (${currency})`
              }
              value={discountValue > 0 ? String(discountValue) : ''}
              onChangeText={(txt) => {
                const num = parseFloat(txt);
                onChange(discountType, isNaN(num) ? 0 : num);
              }}
              keyboardType="decimal-pad"
              placeholder={discountType === 'percentage' ? 'e.g. 10' : '0.00'}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  dropdownWrapper: {
    flex: 1,
  },
  inputWrapper: {
    flex: 1,
  },
});
