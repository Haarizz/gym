import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyGlyph, CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { Trans, useTranslation } from 'react-i18next';

interface ChequePaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  chequeNumber: string;
  bankName: string;
  chequeDate?: Date | null;
  paymentDueDate?: Date | null;
  errors?: Record<string, string>;
  onPaidAmountChange: (val: string) => void;
  onChequeNumberChange: (val: string) => void;
  onBankNameChange: (val: string) => void;
  onChequeDateChange: (date: Date | null) => void;
  onDueDateChange: (date: Date | null) => void;
}

export function ChequePaymentForm({
  finalAmount,
  paidAmount,
  chequeNumber,
  bankName,
  chequeDate,
  paymentDueDate,
  errors,
  onPaidAmountChange,
  onChequeNumberChange,
  onBankNameChange,
  onChequeDateChange,
  onDueDateChange,
}: ChequePaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const numPaid = parseFloat(paidAmount || '0');
  const remaining = Math.max(0, finalAmount - numPaid);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#64748B08',
          borderColor: '#64748B40',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#334155' }}>
        {t('paymentSheet.form.chequeDetails')}
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label={t('paymentSheet.form.chequeNumber')}
            value={chequeNumber}
            onChangeText={onChequeNumberChange}
            placeholder={t('paymentSheet.form.example', { value: 'CHQ-001234' })}
            error={errors?.chequeNumber}
          />
        </View>

        <View style={styles.flex1}>
          <Input
            label={t('paymentSheet.form.bankNameOptional')}
            value={bankName}
            onChangeText={onBankNameChange}
            placeholder={t('paymentSheet.form.example', { value: 'SBI' })}
          />
        </View>
      </View>

      <View style={styles.row}>
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

        <View style={styles.flex1}>
          <DatePicker
            label={t('paymentSheet.form.chequeDateOptional')}
            placeholder={t('paymentSheet.form.selectDate')}
            value={chequeDate ?? null}
            onChange={onChequeDateChange}
          />
        </View>
      </View>

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
