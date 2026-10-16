import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { CurrencyGlyph, CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
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
import { calculateSplitTotal, validateSplitPayment } from '@/shared/payment/domain/paymentCalculations';
import type { PaymentMethod, PaymentSplitRow } from '@/shared/payment/types';

interface MixedPaymentFormProps {
  finalAmount: number;
  rows: PaymentSplitRow[];
  errors?: Record<string, string>;
  onRowsChange: (rows: PaymentSplitRow[]) => void;
}

const SPLIT_METHODS = ['cash', 'card', 'cheque', 'bank_transfer', 'online'] as const;

export function MixedPaymentForm({
  finalAmount,
  rows,
  errors,
  onRowsChange,
}: MixedPaymentFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const splitMethodOptions = SPLIT_METHODS.map((value) => ({
    label: t(`paymentSheet.methods.${value}.title`),
    value,
  }));
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
          {t('paymentSheet.form.mixedDetails')}
        </Typography>
        <Typography variant="caption" style={{ color: theme.textSecondary }}>
          {t('paymentSheet.form.mixedSubtitle')}
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
              {t('paymentSheet.form.leg', { n: index + 1 })}
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
                label={t('paymentSheet.form.method')}
                value={row.method}
                options={splitMethodOptions}
                onChange={(val) =>
                  handleUpdateRow(row.id, { method: val as PaymentMethod })
                }
              />
            </View>

            <View style={styles.flex1}>
              <Input
                label={<Trans i18nKey="paymentSheet.form.amount" components={{ currency: <CurrencyGlyph /> }} />}
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
                label={t('paymentSheet.form.cardType')}
                value={row.cardType ?? ''}
                options={CARD_TYPE_OPTIONS.map((o: string) => ({
                  label: o,
                  value: o,
                }))}
                onChange={(val) => handleUpdateRow(row.id, { cardType: val })}
              />
              <Input
                label={t('paymentSheet.form.referenceOptional')}
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder={t('paymentSheet.form.transactionIdPlaceholder')}
              />
            </View>
          ) : null}

          {row.method === 'cheque' ? (
            <View style={styles.subFields}>
              <Input
                label={t('paymentSheet.form.chequeNumber')}
                value={row.chequeNumber ?? ''}
                onChangeText={(txt) =>
                  handleUpdateRow(row.id, { chequeNumber: txt })
                }
                placeholder={t('paymentSheet.form.chequeNumberPlaceholder')}
              />
              <Input
                label={t('paymentSheet.form.bankNameOptional')}
                value={row.bankName ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { bankName: txt })}
                placeholder={t('paymentSheet.form.example', { value: 'SBI' })}
              />
            </View>
          ) : null}

          {row.method === 'bank_transfer' ? (
            <View style={styles.subFields}>
              <Input
                label={t('paymentSheet.form.transactionReferenceRequired')}
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder={t('paymentSheet.form.referenceIdPlaceholder')}
              />
              <Dropdown
                label={t('paymentSheet.form.bankAccountLedger')}
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
                label={t('paymentSheet.form.paymentType')}
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
                  label={t('paymentSheet.form.providerName')}
                  value={row.providerName ?? ''}
                  onChangeText={(txt) =>
                    handleUpdateRow(row.id, { providerName: txt })
                  }
                  placeholder={t('paymentSheet.form.providerNamePlaceholder')}
                />
              ) : null}
              <Input
                label={t('paymentSheet.form.transactionReferenceRequired')}
                value={row.reference ?? ''}
                onChangeText={(txt) => handleUpdateRow(row.id, { reference: txt })}
                placeholder={t('paymentSheet.form.transactionIdPlaceholder')}
              />
            </View>
          ) : null}
        </View>
      ))}

      <Button
        label={t('paymentSheet.form.addLeg')}
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
            {t('paymentSheet.form.totalSplit')}
          </Typography>
          <Typography
            variant="bodySmallBold"
            style={{ color: isValid ? '#10B981' : theme.error }}
          >
            <CurrencyValue amount={splitTotal} decimals={2} /> / <CurrencyValue amount={finalAmount} decimals={2} />
          </Typography>
        </View>

        {!isValid ? (
          <Typography
            variant="caption"
            style={{ color: theme.error, marginTop: 4 }}
          >
            <Trans
              i18nKey={difference > 0 ? 'paymentSheet.form.exceedBy' : 'paymentSheet.form.shortBy'}
              components={{ amount: <CurrencyValue amount={Math.abs(difference)} decimals={2} /> }}
            />
          </Typography>
        ) : (
          <Typography
            variant="caption"
            style={{ color: '#047857', marginTop: 4 }}
          >
            {t('paymentSheet.form.splitMatches')}
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
