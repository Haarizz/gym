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
import { DEFAULT_BANK_ACCOUNTS, type LedgerBankAccount } from '@/shared/payment/constants';

interface BankTransferPaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  reference: string;
  bankAccountId: string;
  paymentDueDate?: Date | null;
  errors?: Record<string, string>;
  onPaidAmountChange: (val: string) => void;
  onReferenceChange: (val: string) => void;
  onBankAccountIdChange: (val: string) => void;
  onDueDateChange: (date: Date | null) => void;
}

export function BankTransferPaymentForm({
  finalAmount,
  paidAmount,
  reference,
  bankAccountId,
  paymentDueDate,
  errors,
  onPaidAmountChange,
  onReferenceChange,
  onBankAccountIdChange,
  onDueDateChange,
}: BankTransferPaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const numPaid = parseFloat(paidAmount || '0');
  const remaining = Math.max(0, finalAmount - numPaid);

  const bankAccountOptions = DEFAULT_BANK_ACCOUNTS.map((a: LedgerBankAccount) => ({
    label: `${a.code} — ${a.name}`,
    value: a.id,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#14B8A608',
          borderColor: '#14B8A640',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#0F766E' }}>
        {t('paymentSheet.form.bankDetails')}
      </Typography>

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
          <Input
            label={t('paymentSheet.form.referenceIdRequired')}
            value={reference}
            onChangeText={onReferenceChange}
            placeholder={t('paymentSheet.form.example', { value: 'TRF-102938' })}
            error={errors?.reference}
          />
        </View>
      </View>

      <Dropdown
        label={t('paymentSheet.form.bankAccountLedgerOptional')}
        value={bankAccountId}
        options={bankAccountOptions}
        onChange={onBankAccountIdChange}
      />
      <Typography
        variant="caption"
        style={{ color: '#0F766E', marginTop: -4 }}
      >
        {t('paymentSheet.form.ledgerHint')}
      </Typography>

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
