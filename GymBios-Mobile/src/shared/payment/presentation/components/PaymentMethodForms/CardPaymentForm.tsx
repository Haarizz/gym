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
import { CARD_TYPE_OPTIONS } from '@/shared/payment/constants';

interface CardPaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  cardType: string;
  reference: string;
  paymentDueDate?: Date | null;
  errors?: Record<string, string>;
  onPaidAmountChange: (value: string) => void;
  onCardTypeChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onDueDateChange: (date: Date | null) => void;
}

export function CardPaymentForm({
  finalAmount,
  paidAmount,
  cardType,
  reference,
  paymentDueDate,
  errors,
  onPaidAmountChange,
  onCardTypeChange,
  onReferenceChange,
  onDueDateChange,
}: CardPaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const numPaid = parseFloat(paidAmount || '0');
  const remaining = Math.max(0, finalAmount - numPaid);

  const cardDropdownOptions = CARD_TYPE_OPTIONS.map((opt: string) => ({
    label: opt,
    value: opt,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#3B82F608',
          borderColor: '#3B82F640',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#1D4ED8' }}>
        {t('paymentSheet.form.cardDetails')}
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Dropdown
            label={t('paymentSheet.form.cardType')}
            value={cardType}
            options={cardDropdownOptions}
            onChange={onCardTypeChange}
            error={errors?.cardType}
          />
        </View>

        <View style={styles.flex1}>
          <Input
            label={<Trans i18nKey="paymentSheet.form.paidAmount" components={{ currency: <CurrencyGlyph /> }} />}
            value={paidAmount}
            onChangeText={onPaidAmountChange}
            keyboardType="decimal-pad"
            placeholder={finalAmount.toFixed(2)}
            error={errors?.paidAmount}
          />
        </View>
      </View>

      <Input
        label={t('paymentSheet.form.referenceNumberOptional')}
        value={reference}
        onChangeText={onReferenceChange}
        placeholder={t('paymentSheet.form.example', { value: 'TXN-987654' })}
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

        {remaining > 0 ? (
          <View style={[styles.noteBox, { backgroundColor: '#F59E0B15' }]}>
            <Typography variant="caption" style={{ color: '#B45309' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#B45309' }}>
                {t('paymentSheet.form.partialPayment')}{' '}
              </Typography>
              <Trans
                i18nKey="paymentSheet.form.addedToMemberOutstanding"
                components={{ amount: <CurrencyValue amount={remaining} decimals={2} /> }}
              />
            </Typography>
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
  noteBox: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
});
