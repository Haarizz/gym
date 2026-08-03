import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { ONLINE_PAYMENT_TYPE_OPTIONS } from '@/shared/payment/constants';

interface OnlinePaymentFormProps {
  finalAmount: number;
  paidAmount: string;
  onlinePaymentType: string;
  providerName: string;
  reference: string;
  paymentDueDate?: Date | null;
  currency?: string;
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
  currency = '₹',
  errors,
  onPaidAmountChange,
  onOnlinePaymentTypeChange,
  onProviderNameChange,
  onReferenceChange,
  onDueDateChange,
}: OnlinePaymentFormProps) {
  const theme = useTheme();
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
        Online Payment Details
      </Typography>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Dropdown
            label="Online Payment Type *"
            value={onlinePaymentType}
            options={onlineOptions}
            onChange={onOnlinePaymentTypeChange}
            error={errors?.onlinePaymentType}
          />
        </View>

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
      </View>

      {onlinePaymentType === 'Other' ? (
        <Input
          label="Payment Provider Name *"
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
        placeholder="e.g. PAY-884920"
        error={errors?.reference}
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
