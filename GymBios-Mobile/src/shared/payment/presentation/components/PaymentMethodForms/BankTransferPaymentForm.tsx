import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { DEFAULT_BANK_ACCOUNTS, type LedgerBankAccount } from '@/shared/payment/constants';

interface BankTransferPaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  reference: string;
  bankAccountId: string;
  paymentDueDate?: Date | null;
  currency?: string;
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
  currency = '₹',
  errors,
  onPaidAmountChange,
  onReferenceChange,
  onBankAccountIdChange,
  onDueDateChange,
}: BankTransferPaymentFormProps) {
  const theme = useTheme();
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
        Bank Transfer Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label={`Amount (${currency}) *`}
            value={paidAmount}
            onChangeText={onPaidAmountChange}
            keyboardType="decimal-pad"
            placeholder={finalAmount.toFixed(2)}
            error={errors?.paidAmount}
          />
        </View>

        <View style={styles.flex1}>
          <Input
            label="Reference / Transaction ID *"
            value={reference}
            onChangeText={onReferenceChange}
            placeholder="e.g. TRF-102938"
            error={errors?.reference}
          />
        </View>
      </View>

      <Dropdown
        label="Bank Account (Ledger, Optional)"
        value={bankAccountId}
        options={bankAccountOptions}
        onChange={onBankAccountIdChange}
      />
      <Typography
        variant="caption"
        style={{ color: '#0F766E', marginTop: -4 }}
      >
        Accounts pulled from Chart of Accounts. Amount will be credited to selected account.
      </Typography>

      {remaining > 0 ? (
        <DatePicker
          label="Payment Due Date *"
          placeholder="Select due date"
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
            Final Amount:
          </Typography>
          <Typography variant="bodySmallBold">
            {currency} {finalAmount.toFixed(2)}
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            Paid Amount:
          </Typography>
          <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
            {currency} {(numPaid || 0).toFixed(2)}
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="caption" color="textSecondary">
            Remaining/Due:
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={{ color: remaining > 0 ? theme.error : '#10B981' }}
          >
            {currency} {remaining.toFixed(2)}
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
