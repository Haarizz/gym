import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

interface ChequePaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  chequeNumber: string;
  bankName: string;
  chequeDate?: Date | null;
  paymentDueDate?: Date | null;
  currency?: string;
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
  currency = '₹',
  errors,
  onPaidAmountChange,
  onChequeNumberChange,
  onBankNameChange,
  onChequeDateChange,
  onDueDateChange,
}: ChequePaymentFormProps) {
  const theme = useTheme();
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
        Cheque Payment Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label="Cheque Number *"
            value={chequeNumber}
            onChangeText={onChequeNumberChange}
            placeholder="e.g. CHQ-001234"
            error={errors?.chequeNumber}
          />
        </View>

        <View style={styles.flex1}>
          <Input
            label="Bank Name (Optional)"
            value={bankName}
            onChangeText={onBankNameChange}
            placeholder="e.g. SBI"
          />
        </View>
      </View>

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
          <DatePicker
            label="Cheque Date (Optional)"
            placeholder="Select date"
            value={chequeDate ?? null}
            onChange={onChequeDateChange}
          />
        </View>
      </View>

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
