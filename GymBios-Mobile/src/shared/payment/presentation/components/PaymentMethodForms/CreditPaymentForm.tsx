import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
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
  currency?: string;
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

const RECEIVED_VIA_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Online Payment', value: 'online' },
];

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
  currency = '₹',
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
        Credit Payment Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label={`Received Amount (${currency})`}
            value={receivedAmount}
            onChangeText={onReceivedAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00 (Leave empty for full credit)"
            error={errors?.receivedAmount}
          />
        </View>

        {showReceivedVia ? (
          <View style={styles.flex1}>
            <Dropdown
              label="Received Via *"
              value={receivedVia}
              options={RECEIVED_VIA_OPTIONS}
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
            label="Card Type *"
            value={cardType}
            options={CARD_TYPE_OPTIONS.map((o: string) => ({ label: o, value: o }))}
            onChange={onCardTypeChange}
            error={errors?.cardType}
          />
          <Input
            label="Reference (Optional)"
            value={reference}
            onChangeText={onReferenceChange}
            placeholder="Transaction ID"
          />
        </View>
      ) : null}

      {showReceivedVia && receivedVia === 'cheque' ? (
        <View style={styles.subBox}>
          <Input
            label="Cheque Number *"
            value={chequeNumber}
            onChangeText={onChequeNumberChange}
            placeholder="Cheque number"
            error={errors?.chequeNumber}
          />
          <Input
            label="Bank Name (Optional)"
            value={bankName}
            onChangeText={onBankNameChange}
            placeholder="e.g. HDFC"
          />
        </View>
      ) : null}

      {showReceivedVia && receivedVia === 'bank_transfer' ? (
        <View style={styles.subBox}>
          <Input
            label="Reference / Transaction ID *"
            value={reference}
            onChangeText={onReferenceChange}
            placeholder="Transaction ID"
            error={errors?.reference}
          />
          <Dropdown
            label="Bank Account (Ledger)"
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
            label="Online Payment Type *"
            value={onlinePaymentType}
            options={ONLINE_PAYMENT_TYPE_OPTIONS.map((o: string) => ({ label: o, value: o }))}
            onChange={onOnlinePaymentTypeChange}
            error={errors?.onlinePaymentType}
          />
          {onlinePaymentType === 'Other' ? (
            <Input
              label="Provider Name *"
              value={providerName}
              onChangeText={onProviderNameChange}
              placeholder="e.g. Razorpay"
              error={errors?.providerName}
            />
          ) : null}
          <Input
            label="Transaction / Reference ID *"
            value={reference}
            onChangeText={onReferenceChange}
            placeholder="Transaction ID"
            error={errors?.reference}
          />
        </View>
      ) : null}

      <DatePicker
        label={`Payment Due Date ${remaining > 0 ? '*' : '(Optional)'}`}
        placeholder="Select due date"
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
            Final Amount:
          </Typography>
          <Typography variant="bodySmallBold">
            {currency} {finalAmount.toFixed(2)}
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            Received Amount:
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: '#10B981' }}>
            {currency} {(showReceivedVia ? numReceived : 0).toFixed(2)}
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            Remaining (On Credit):
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: '#B45309' }}>
            {currency} {remaining.toFixed(2)}
          </Typography>
        </View>

        {!showReceivedVia ? (
          <View style={[styles.noteBox, { backgroundColor: '#F59E0B15' }]}>
            <Typography variant="caption" style={{ color: '#B45309' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#B45309' }}>
                Full Credit:{' '}
              </Typography>
              Member will have the entire {currency} {finalAmount.toFixed(2)} on credit.
            </Typography>
          </View>
        ) : (
          <View style={[styles.noteBox, { backgroundColor: '#10B98115' }]}>
            <Typography variant="caption" style={{ color: '#047857' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#047857' }}>
                Partial Received:{' '}
              </Typography>
              {currency} {numReceived.toFixed(2)} received via {receivedVia || 'other method'}. Remaining {currency} {remaining.toFixed(2)} recorded on credit.
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
