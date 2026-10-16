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
import {
  CARD_TYPE_OPTIONS,
  DEFAULT_BANK_ACCOUNTS,
  ONLINE_PAYMENT_TYPE_OPTIONS,
  type LedgerBankAccount,
} from '@/shared/payment/constants';
import type { PaymentMethod } from '@/shared/payment/types';

interface CreditPaymentFormProps {
  finalAmount: number;
  receivedAmount: string;
  receivedVia: PaymentMethod | '';
  cardType: string;
  reference: string;
  chequeNumber: string;
  bankName: string;
  bankAccountId: string;
  onlinePaymentType: string;
  providerName: string;
  paymentDueDate?: Date | null;
  errors?: Record<string, string>;
  onReceivedAmountChange: (val: string) => void;
  onReceivedViaChange: (val: PaymentMethod | '') => void;
  onCardTypeChange: (val: string) => void;
  onReferenceChange: (val: string) => void;
  onChequeNumberChange: (val: string) => void;
  onBankNameChange: (val: string) => void;
  onBankAccountIdChange: (val: string) => void;
  onOnlinePaymentTypeChange: (val: string) => void;
  onProviderNameChange: (val: string) => void;
  onDueDateChange: (date: Date | null) => void;
}

const RECEIVED_VIA_METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'online'] as const;

export function CreditPaymentForm({
  finalAmount,
  receivedAmount,
  receivedVia,
  cardType,
  reference,
  chequeNumber,
  bankName,
  bankAccountId,
  onlinePaymentType,
  providerName,
  paymentDueDate,
  errors,
  onReceivedAmountChange,
  onReceivedViaChange,
  onCardTypeChange,
  onReferenceChange,
  onChequeNumberChange,
  onBankNameChange,
  onBankAccountIdChange,
  onOnlinePaymentTypeChange,
  onProviderNameChange,
  onDueDateChange,
}: CreditPaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const receivedViaOptions = RECEIVED_VIA_METHODS.map((value) => ({
    label: t(`paymentSheet.methods.${value}.title`),
    value,
  }));
  const numReceived = parseFloat(receivedAmount || '0');
  const showReceivedVia = !isNaN(numReceived) && numReceived > 0;
  const remaining = Math.max(0, finalAmount - (showReceivedVia ? numReceived : 0));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#F59E0B08',
          borderColor: '#F59E0B40',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#B45309' }}>
        {t('paymentSheet.form.creditDetails')}
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label={<Trans i18nKey="paymentSheet.form.receivedAmount" components={{ currency: <CurrencyGlyph /> }} />}
            value={receivedAmount}
            onChangeText={onReceivedAmountChange}
            keyboardType="decimal-pad"
            placeholder={t('paymentSheet.form.receivedPlaceholder')}
            error={errors?.receivedAmount}
          />
        </View>

        {showReceivedVia ? (
          <View style={styles.flex1}>
            <Dropdown
              label={t('paymentSheet.form.receivedVia')}
              value={receivedVia}
              options={receivedViaOptions}
              onChange={(v) => onReceivedViaChange(v as PaymentMethod)}
              error={errors?.receivedVia}
            />
          </View>
        ) : null}
      </View>

      {/* Sub-fields depending on Received Via */}
      {showReceivedVia && receivedVia === 'card' ? (
        <View style={styles.subBox}>
          <Dropdown
            label={t('paymentSheet.form.cardType')}
            value={cardType}
            options={CARD_TYPE_OPTIONS.map((o: string) => ({ label: o, value: o }))}
            onChange={onCardTypeChange}
            error={errors?.cardType}
          />
          <Input
            label={t('paymentSheet.form.referenceOptional')}
            value={reference}
            onChangeText={onReferenceChange}
            placeholder={t('paymentSheet.form.transactionIdPlaceholder')}
          />
        </View>
      ) : null}

      {showReceivedVia && receivedVia === 'cheque' ? (
        <View style={styles.subBox}>
          <Input
            label={t('paymentSheet.form.chequeNumber')}
            value={chequeNumber}
            onChangeText={onChequeNumberChange}
            placeholder={t('paymentSheet.form.chequeNumberPlaceholder')}
            error={errors?.chequeNumber}
          />
          <Input
            label={t('paymentSheet.form.bankNameOptional')}
            value={bankName}
            onChangeText={onBankNameChange}
            placeholder={t('paymentSheet.form.example', { value: 'HDFC' })}
          />
        </View>
      ) : null}

      {showReceivedVia && receivedVia === 'bank_transfer' ? (
        <View style={styles.subBox}>
          <Input
            label={t('paymentSheet.form.referenceIdRequired')}
            value={reference}
            onChangeText={onReferenceChange}
            placeholder={t('paymentSheet.form.transactionIdPlaceholder')}
            error={errors?.reference}
          />
          <Dropdown
            label={t('paymentSheet.form.bankAccountLedger')}
            value={bankAccountId}
            options={DEFAULT_BANK_ACCOUNTS.map((a: LedgerBankAccount) => ({
              label: `${a.code} — ${a.name}`,
              value: a.id,
            }))}
            onChange={onBankAccountIdChange}
          />
        </View>
      ) : null}

      {showReceivedVia && receivedVia === 'online' ? (
        <View style={styles.subBox}>
          <Dropdown
            label={t('paymentSheet.form.onlinePaymentType')}
            value={onlinePaymentType}
            options={ONLINE_PAYMENT_TYPE_OPTIONS.map((o: string) => ({ label: o, value: o }))}
            onChange={onOnlinePaymentTypeChange}
            error={errors?.onlinePaymentType}
          />
          {onlinePaymentType === 'Other' ? (
            <Input
              label={t('paymentSheet.form.providerName')}
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
            placeholder={t('paymentSheet.form.transactionIdPlaceholder')}
            error={errors?.reference}
          />
        </View>
      ) : null}

      <DatePicker
        label={t(remaining > 0 ? 'paymentSheet.form.dueDate' : 'paymentSheet.form.dueDateOptional')}
        placeholder={t('paymentSheet.form.selectDueDate')}
        value={paymentDueDate ?? null}
        onChange={onDueDateChange}
        minimumDate={new Date()}
        error={errors?.paymentDueDate}
      />

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
            {t('paymentSheet.form.receivedAmountLabel')}
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: '#10B981' }}>
            <CurrencyValue amount={(showReceivedVia ? numReceived : 0)} decimals={2} />
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            {t('paymentSheet.form.remainingOnCredit')}
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: '#B45309' }}>
            <CurrencyValue amount={remaining} decimals={2} />
          </Typography>
        </View>

        {!showReceivedVia ? (
          <View style={[styles.noteBox, { backgroundColor: '#F59E0B15' }]}>
            <Typography variant="caption" style={{ color: '#B45309' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#B45309' }}>
                {t('paymentSheet.form.fullCredit')}{' '}
              </Typography>
              <Trans
                i18nKey="paymentSheet.form.entireOnCredit"
                components={{ amount: <CurrencyValue amount={finalAmount} decimals={2} /> }}
              />
            </Typography>
          </View>
        ) : (
          <View style={[styles.noteBox, { backgroundColor: '#10B98115' }]}>
            <Typography variant="caption" style={{ color: '#047857' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#047857' }}>
                {t('paymentSheet.form.partialReceived')}{' '}
              </Typography>
              <Trans
                i18nKey="paymentSheet.form.receivedViaNote"
                values={{
                  method: receivedVia
                    ? t(`paymentSheet.methods.${receivedVia}.title`)
                    : t('paymentSheet.form.otherMethod'),
                }}
                components={{
                  received: <CurrencyValue amount={numReceived} decimals={2} />,
                  remaining: <CurrencyValue amount={remaining} decimals={2} />,
                }}
              />
            </Typography>
          </View>
        )}
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
  subBox: {
    padding: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: Spacing.two,
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
