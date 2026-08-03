import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { CARD_TYPE_OPTIONS } from '@/shared/payment/constants';

interface CardPaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  cardType: string;
  reference: string;
  paymentDueDate?: Date | null;
  currency?: string;
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
  currency = '₹',
  errors,
  onPaidAmountChange,
  onCardTypeChange,
  onReferenceChange,
  onDueDateChange,
}: CardPaymentFormProps) {
  const theme = useTheme();
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
        Card Payment Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Dropdown
            label="Card Type *"
            value={cardType}
            options={cardDropdownOptions}
            onChange={onCardTypeChange}
            error={errors?.cardType}
          />
        </View>

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
      </View>

      <Input
        label="Reference / Transaction Number (Optional)"
        value={reference}
        onChangeText={onReferenceChange}
        placeholder="e.g. TXN-987654"
      />

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

        {remaining > 0 ? (
          <View style={[styles.noteBox, { backgroundColor: '#F59E0B15' }]}>
            <Typography variant="caption" style={{ color: '#B45309' }}>
              <Typography variant="caption" style={{ fontWeight: '700', color: '#B45309' }}>
                Partial Payment:{' '}
              </Typography>
              {currency} {remaining.toFixed(2)} will be added to member's outstanding balance.
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
