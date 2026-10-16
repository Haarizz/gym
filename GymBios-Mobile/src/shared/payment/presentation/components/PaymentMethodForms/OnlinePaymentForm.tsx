import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyGlyph, CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { Trans, useTranslation } from 'react-i18next';
import { ONLINE_PAYMENT_TYPE_OPTIONS } from '@/shared/payment/constants';

interface OnlinePaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  onlinePaymentType: string;
  providerName: string;
  reference: string;
  paymentDueDate?: Date | null;
  errors?: Record<string, string>;
  onPaidAmountChange: (val: string) => void;
  onOnlinePaymentTypeChange: (val: string) => void;
  onProviderNameChange: (val: string) => void;
  onReferenceChange: (val: string) => void;
  onDueDateChange: (date: Date | null) => void;
}

export function OnlinePaymentForm({
  finalAmount,
  paidAmount,
  onlinePaymentType,
  providerName,
  reference,
  paymentDueDate,
  errors,
  onPaidAmountChange,
  onOnlinePaymentTypeChange,
  onProviderNameChange,
  onReferenceChange,
  onDueDateChange,
}: OnlinePaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const numPaid = parseFloat(paidAmount || '0');
  const remaining = Math.max(0, finalAmount - numPaid);

  const onlineOptions = ONLINE_PAYMENT_TYPE_OPTIONS.map((o: string) => ({
    label: o,
    value: o,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#EF444408',
          borderColor: '#EF444440',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#B91C1C' }}>
        {t('paymentSheet.form.onlineDetails')}
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Dropdown
            label={t('paymentSheet.form.onlinePaymentType')}
            value={onlinePaymentType}
            options={onlineOptions}
            onChange={onOnlinePaymentTypeChange}
            error={errors?.onlinePaymentType}
          />
        </View>

        <View style={styles.flex1}>
          <Input
            label={<Trans i18nKey="paymentSheet.form.amount" components={{ currency: <CurrencyGlyph /> }} />}
            value={paidAmount}
            onChangeText={onPaidAmountChange}
            keyboardType="decimal-pad"
            placeholder={finalAmount.toFixed(2)}
            error={errors?.paidAmount}
          />
        </View>
      </View>

      {onlinePaymentType === 'Other' ? (
        <Input
          label={t('paymentSheet.form.paymentProviderName')}
          value={providerName}
          onChangeText={onProviderNameChange}
          placeholder={t('paymentSheet.form.example', { value: 'Razorpay' })}
          error={errors?.providerName}
        />
      ) : null}

      <Input
        label={t('paymentSheet.form.transactionReferenceIdRequired')}
        value={reference}
        onChangeText={onReferenceChange}
        placeholder={t('paymentSheet.form.example', { value: 'PAY-884920' })}
        error={errors?.reference}
      />

      {remaining > 0 ? (
        <DatePicker
          label={t('paymentSheet.form.dueDate')}
          placeholder={t('paymentSheet.form.selectDueDate')}
          value={paymentDueDate ?? null}
          onChange={onDueDateChange}
          minimumDate={new Date()}
          error={errors?.paymentDueDate}
        />
      ) : null}

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            {t('paymentSheet.form.finalAmount')}
          </Typography>
          <Typography variant="bodySmallBold">
            <CurrencyValue amount={finalAmount} decimals={2} />
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            {t('paymentSheet.form.paidAmountLabel')}
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
            <CurrencyValue amount={(numPaid || 0)} decimals={2} />
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            {t('paymentSheet.form.remainingOrDue')}
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={{ color: remaining > 0 ? theme.error : '#10B981' }}
          >
            <CurrencyValue amount={remaining} decimals={2} />
          </Typography>
        </View>
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.two,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
