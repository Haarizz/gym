import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

interface CashPaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  paymentDueDate?: Date | null;
  currency?: string;
  errors?: Record<string, string>;
  onPaidAmountChange: (value: string) => void;
  onDueDateChange: (date: Date | null) => void;
}

export function CashPaymentForm({
  finalAmount,
  paidAmount,
  paymentDueDate,
  currency = '₹',
  errors,
  onPaidAmountChange,
  onDueDateChange,
}: CashPaymentFormProps) {
  const theme = useTheme();

  const numPaid = parseFloat(paidAmount || '0');
  const payBack = Math.max(0, numPaid - finalAmount);
  const remaining = Math.max(0, finalAmount - numPaid);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#10B98108',
          borderColor: '#10B98140',
        },
      ]}
    >
      <Typography variant="bodySmallBold" style={{ color: '#065F46' }}>
        Cash Payment Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label={`Paid Amount (${currency}) *`}
            value={paidAmount}
            onChangeText={onPaidAmountChange}
            keyboardType="decimal-pad"
            placeholder={finalAmount.toFixed(2)}
            error={errors?.paidAmount}
          />
        </View>

        <View style={styles.flex1}>
          <Typography variant="bodySmallBold" style={styles.label}>
            Pay Back Amount ({currency})
          </Typography>
          <View
            style={[
              styles.readOnlyBox,
              {
                backgroundColor: '#10B98115',
                borderColor: '#10B98140',
              },
            ]}
          >
            <Typography variant="bodySmallBold" style={{ color: '#047857' }}>
              {currency} {payBack.toFixed(2)}
            </Typography>
          </View>
          <Typography
            variant="caption"
            style={{ color: theme.textSecondary, marginTop: 4 }}
          >
            Amount to return
          </Typography>
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
            {remaining > 0 ? 'Remaining Due:' : 'Pay Back:'}
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={{ color: remaining > 0 ? theme.error : '#10B981' }}
          >
            {currency} {remaining > 0 ? remaining.toFixed(2) : payBack.toFixed(2)}
          </Typography>
        </View>

        {payBack > 0 ? (
          <View style={[styles.noteBox, { backgroundColor: '#10B98115' }]}>
            <Typography variant="caption" style={{ color: '#047857' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#047857' }}>
                Cash Return Required:{' '}
              </Typography>
              Return {currency} {payBack.toFixed(2)} to customer
            </Typography>
          </View>
        ) : remaining > 0 ? (
          <View style={[styles.noteBox, { backgroundColor: '#F59E0B15' }]}>
            <Typography variant="caption" style={{ color: '#B45309' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#B45309' }}>
                Partial Payment:{' '}
              </Typography>
              {currency} {remaining.toFixed(2)} will be added to outstanding balance.
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
  label: {
    marginBottom: Spacing.one,
  },
  readOnlyBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
