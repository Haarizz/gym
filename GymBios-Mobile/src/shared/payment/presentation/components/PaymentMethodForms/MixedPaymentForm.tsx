import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import {
  CARD_TYPE_OPTIONS,
  DEFAULT_BANK_ACCOUNTS,
  ONLINE_PAYMENT_TYPE_OPTIONS,
  type LedgerBankAccount,
} from '@/shared/payment/constants';
import { calculateSplitTotal, validateSplitPayment } from '@/shared/payment/domain/paymentCalculations';
import type { PaymentMethod, PaymentSplitRow } from '@/shared/payment/types';

interface MixedPaymentFormProps {
  finalAmount: number;
  rows: PaymentSplitRow[];
  currency?: string;
  errors?: Record<string, string>;
  onRowsChange: (rows: PaymentSplitRow[]) => void;
}

const SPLIT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Online Payment', value: 'online' },
];

export function MixedPaymentForm({
  finalAmount,
  rows,
  currency = '₹',
  errors,
  onRowsChange,
}: MixedPaymentFormProps) {
  const theme = useTheme();
  const splitTotal = calculateSplitTotal(rows);
  const { isValid, difference } = validateSplitPayment(rows, finalAmount);

  const handleAddRow = () => {
    const remaining = Math.max(0, finalAmount - splitTotal);
    const newRow: PaymentSplitRow = {
      id: String(Date.now() + Math.random()),
      method: 'cash',
      amount: remaining,
    };
    onRowsChange([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, updates: Partial<PaymentSplitRow>) => {
    onRowsChange(
      rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#8B5CF608',
          borderColor: '#8B5CF640',
        },
      ]}
    >
      <View style={styles.header}>
        <Typography variant="bodySmallBold" style={{ color: '#6D28D9' }}>
          Mixed / Split Payment Details
        </Typography>
        <Typography variant="caption" style={{ color: theme.textSecondary }}>
          Split total across multiple methods
        </Typography>
      </View>

      {rows.map((row, index) => (
        <View
          key={row.id}
          style={[
            styles.rowCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.rowCardHeader}>
            <Typography variant="bodySmallBold" style={{ color: theme.text }}>
              Leg #{index + 1}
            </Typography>
            {rows.length > 1 ? (
              <Pressable
                onPress={() => handleRemoveRow(row.id)}
                style={styles.removeBtn}
                hitSlop={8}
              >
                <Feather name="trash-2" size={16} color={theme.error} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.flexRow}>
            <View style={styles.flex1}>
              <Dropdown
                label="Method *"
                value={row.method}
                options={SPLIT_METHOD_OPTIONS}
                onChange={(val) =>
                  handleUpdateRow(row.id, { method: val as PaymentMethod })
                }
              />
            </View>

            <View style={styles.flex1}>
              <Input
                label={`Amount (${currency}) *`}
                value={row.amount > 0 ? String(row.amount) : ''}
                onChangeText={(txt) => {
                  const num = parseFloat(txt);
                  handleUpdateRow(row.id, { amount: isNaN(num) ? 0 : num });
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>

          {/* Method specific fields */}
          {row.method === 'card' ? (
            <View style={styles.subFields}>
              <Dropdown
                label="Card Type *"
                value={row.cardType ?? ''}
                options={CARD_TYPE_OPTIONS.map((o: string) => ({
                  label: o,
                  value: o,
                }))}
                onChange={(val) => handleUpdateRow(row.id, { cardType: val })}
              />
              <Input
                label="Reference (Optional)"
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder="Transaction ID"
              />
            </View>
          ) : null}

          {row.method === 'cheque' ? (
            <View style={styles.subFields}>
              <Input
                label="Cheque Number *"
                value={row.chequeNumber ?? ''}
                onChangeText={(txt) =>
                  handleUpdateRow(row.id, { chequeNumber: txt })
                }
                placeholder="Cheque number"
              />
              <Input
                label="Bank Name (Optional)"
                value={row.bankName ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { bankName: txt })}
                placeholder="e.g. SBI"
              />
            </View>
          ) : null}

          {row.method === 'bank_transfer' ? (
            <View style={styles.subFields}>
              <Input
                label="Transaction Reference *"
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder="Reference ID"
              />
              <Dropdown
                label="Bank Account (Ledger)"
                value={row.bankAccountId ?? ''}
                options={DEFAULT_BANK_ACCOUNTS.map((a: LedgerBankAccount) => ({
                  label: `${a.code} — ${a.name}`,
                  value: a.id,
                }))}
                onChange={(val) =>
                  handleUpdateRow(row.id, { bankAccountId: val })
                }
              />
            </View>
          ) : null}

          {row.method === 'online' ? (
            <View style={styles.subFields}>
              <Dropdown
                label="Payment Type *"
                value={row.onlinePaymentType ?? ''}
                options={ONLINE_PAYMENT_TYPE_OPTIONS.map((o: string) => ({
                  label: o,
                  value: o,
                }))}
                onChange={(val) =>
                  handleUpdateRow(row.id, { onlinePaymentType: val })
                }
              />
              {row.onlinePaymentType === 'Other' ? (
                <Input
                  label="Provider Name *"
                  value={row.providerName ?? ''}
                  onChangeText={(txt) =>
                    handleUpdateRow(row.id, { providerName: txt })
                  }
                  placeholder="Provider name"
                />
              ) : null}
              <Input
                label="Transaction Reference *"
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder="Transaction ID"
              />
            </View>
          ) : null}
        </View>
      ))}

      <Button
        label="+ Add Payment Leg"
        variant="secondary"
        onPress={handleAddRow}
        size="md"
      />

      {/* Validation Banner */}
      <View
        style={[
          styles.validationBanner,
          {
            backgroundColor: isValid ? '#10B98115' : '#EF444415',
            borderColor: isValid ? '#10B98140' : '#EF444440',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <Typography variant="bodySmallBold" style={{ color: theme.text }}>
            Total Split Amount:
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={{ color: isValid ? '#10B981' : theme.error }}
          >
            {currency} {splitTotal.toFixed(2)} / {currency} {finalAmount.toFixed(2)}
          </Typography>
        </View>

        {!isValid ? (
          <Typography
            variant="caption"
            style={{ color: theme.error, marginTop: 4 }}
          >
            {difference > 0
              ? `Split amounts exceed final amount by ${currency} ${difference.toFixed(2)}`
              : `Split amounts fall short by ${currency} ${Math.abs(difference).toFixed(2)}`}
          </Typography>
        ) : (
          <Typography
            variant="caption"
            style={{ color: '#047857', marginTop: 4 }}
          >
            Split total matches final amount perfectly.
          </Typography>
        )}
      </View>

      {errors?.rows ? (
        <Typography variant="caption" color="error">
          {errors.rows}
        </Typography>
      ) : null}
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
  header: {
    marginBottom: Spacing.one,
  },
  rowCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  rowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeBtn: {
    padding: 4,
  },
  flexRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  subFields: {
    gap: Spacing.two,
    paddingTop: 4,
  },
  validationBanner: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
