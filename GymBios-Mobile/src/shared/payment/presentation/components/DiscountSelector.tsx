import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyGlyph } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { Trans, useTranslation } from 'react-i18next';
import type { DiscountType } from '@/shared/payment/types';

interface DiscountSelectorProps {
  discountType: DiscountType;
  discountValue: number;
  onChange: (type: DiscountType, value: number) => void;
}

const DISCOUNT_TYPES = ['none', 'fixed', 'percentage'] as const;

export function DiscountSelector({
  discountType,
  discountValue,
  onChange,
}: DiscountSelectorProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const discountTypeOptions = DISCOUNT_TYPES.map((value) => ({
    label: t(`paymentSheet.discount.${value}`),
    value,
  }));

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
        {t('paymentSheet.discount.title')}
      </Typography>

      <View style={styles.row}>
        <View style={styles.dropdownWrapper}>
          <Dropdown
            label={t('paymentSheet.discount.type')}
            value={discountType}
            options={discountTypeOptions}
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
                  ? t('paymentSheet.discount.percentLabel')
                  : <Trans i18nKey="paymentSheet.discount.amountLabel" components={{ currency: <CurrencyGlyph /> }} />
              }
              value={discountValue > 0 ? String(discountValue) : ''}
              onChangeText={(txt) => {
                const num = parseFloat(txt);
                onChange(discountType, isNaN(num) ? 0 : num);
              }}
              keyboardType="decimal-pad"
              placeholder={discountType === 'percentage' ? t('paymentSheet.form.example', { value: '10' }) : '0.00'}
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
