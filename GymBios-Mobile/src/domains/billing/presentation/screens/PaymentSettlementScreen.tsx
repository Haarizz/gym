import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { usePendingBills } from '../../hooks/useBills';
import { useSettlePayment } from '../../hooks/useBillActions';
import { usePaymentForm } from '../hooks/usePaymentForm';
import { PaymentMethod } from '../../domain/Receipt';
import {
  BillingSection,
  BillingSkeleton,
  ErrorState,
  MoneyText,
  PaymentMethodBadge,
  PaymentSummaryCard,
} from '../components';

interface PaymentSettlementScreenProps {
  memberId: number;
  memberName?: string;
  selectedBillIds: string[];
  onBack: () => void;
  /** Called on successful settlement — navigate to the new receipt details. */
  onSuccess: (receiptId: string) => void;
}

const PAYMENT_METHODS = [
  PaymentMethod.Cash,
  PaymentMethod.Card,
  PaymentMethod.Online,
  PaymentMethod.BankTransfer,
  PaymentMethod.Wallet,
  PaymentMethod.Cheque,
];

/**
 * Payment Settlement Screen.
 *
 * Step flow:
 *  1. Review selected bills + amounts
 *  2. Select payment method
 *  3. Enter date / reference / remarks
 *  4. Review summary (bottom sheet)
 *  5. Confirm → useSettlePayment() mutation → onSuccess
 *
 * Consumes:
 *  - usePendingBills(memberId)   — to resolve bill details from IDs
 *  - useSettlePayment()          — mutation hook
 *  - usePaymentForm()            — local form state (no API)
 *
 * Cache invalidation after success is handled automatically by
 * useSettlePayment's onSuccess handler. No manual refetch needed.
 */
export function PaymentSettlementScreen({
  memberId,
  memberName,
  selectedBillIds,
  onBack,
  onSuccess,
}: PaymentSettlementScreenProps) {
  const { bills, loading: billsLoading } = usePendingBills(memberId);
  const settlePayment = useSettlePayment();

  const form = usePaymentForm();

  // Initialise form amounts from selected bills whenever bills arrive
  const selectedBills = bills.filter((b) => selectedBillIds.includes(b.id));

  useEffect(() => {
    if (selectedBills.length > 0 && form.billAmounts.length === 0) {
      form.initBillAmounts(
        selectedBills.map((b) => ({
          receiptId: Number(b.id),
          payAmount: String(b.dueAmount),
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBills.length]);

  const handleConfirm = useCallback(async () => {
    try {
      const response = await settlePayment.mutateAsync({
        memberDbId: memberId,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        transactionRef: form.transactionRef || undefined,
        remarks: form.remarks || undefined,
        billPayments: form.billAmounts.map((e) => ({
          receiptId: e.receiptId,
          payAmount: parseFloat(e.payAmount) || 0,
        })),
      });
      form.hideReview();
      form.reset();
      onSuccess(response.id);
    } catch (err: any) {
      form.hideReview();
      Alert.alert('Payment Failed', err?.message ?? 'Something went wrong. Please try again.');
    }
  }, [memberId, form, settlePayment, onSuccess]);

  if (billsLoading && selectedBills.length === 0) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Payment Settlement"
          subtitle={memberName ?? ''}
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <BillingSkeleton variant="list" count={3} />
      </ScreenLayout>
    );
  }

  if (selectedBills.length === 0 && !billsLoading) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Payment Settlement"
          subtitle={memberName ?? ''}
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <ErrorState
          message="The selected bills could not be loaded."
          onRetry={onBack}
        />
      </ScreenLayout>
    );
  }

  const summaryRows = selectedBills.map((bill) => {
    const entry = form.billAmounts.find((e) => e.receiptId === Number(bill.id));
    return {
      label: bill.receiptNo ?? `Bill #${bill.id}`,
      amount: parseFloat(entry?.payAmount ?? '0') || 0,
    };
  });

  return (
    <ScreenLayout>
      <AppHeader
        title="Payment Settlement"
        subtitle={memberName ?? ''}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Bills & amounts ──────────────────────────────────── */}
        <BillingSection title="Bills to Settle">
          <View style={styles.billsCard}>
            {selectedBills.map((bill, index) => {
              const entry = form.billAmounts.find(
                (e) => e.receiptId === Number(bill.id),
              );
              return (
                <View
                  key={bill.id}
                  style={[styles.billRow, index > 0 && styles.billRowBorder]}
                >
                  <View style={styles.billInfo}>
                    <Typography variant="bodySmall" style={styles.billNo}>
                      {bill.receiptNo ?? `Bill #${bill.id}`}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {bill.planName ?? 'Membership'}
                    </Typography>
                    <View style={styles.dueRow}>
                      <Typography variant="caption" color="textSecondary">
                        Outstanding:{' '}
                      </Typography>
                      <MoneyText
                        amount={bill.dueAmount}
                        variant="caption"
                        color="#b91c1c"
                      />
                    </View>
                  </View>

                  {/* Amount input */}
                  <View style={styles.amountInput}>
                    <Typography variant="caption" color="textSecondary" style={styles.currencySymbol}>
                      ₹
                    </Typography>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      value={entry?.payAmount ?? ''}
                      onChangeText={(text) =>
                        form.setBillAmount(Number(bill.id), text)
                      }
                      placeholder="0.00"
                      placeholderTextColor={BrandColors.textSecondary}
                      accessibilityLabel={`Payment amount for ${bill.receiptNo ?? bill.id}`}
                    />
                  </View>
                </View>
              );
            })}

            {/* Total row */}
            <View style={styles.totalRow}>
              <Typography variant="bodySmallBold">Total Payment</Typography>
              <MoneyText
                amount={form.totalAmount}
                variant="bodySmallBold"
                color={BrandColors.teal}
              />
            </View>
          </View>
        </BillingSection>

        {/* ── Payment method ───────────────────────────────────── */}
        <BillingSection title="Payment Method">
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method}
                onPress={() => form.setPaymentMethod(method)}
                style={[
                  styles.methodChip,
                  form.paymentMethod === method && styles.methodChipActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.paymentMethod === method }}
              >
                <PaymentMethodBadge method={method} />
              </Pressable>
            ))}
          </View>
        </BillingSection>

        {/* ── Payment details ──────────────────────────────────── */}
        <BillingSection title="Payment Details">
          <View style={styles.formCard}>
            {/* Date */}
            <View style={styles.formRow}>
              <Feather name="calendar" size={16} color={BrandColors.textSecondary} />
              <TextInput
                style={styles.formInput}
                value={form.paymentDate}
                onChangeText={form.setPaymentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={BrandColors.textSecondary}
                accessibilityLabel="Payment date"
              />
            </View>

            <View style={styles.formDivider} />

            {/* Reference */}
            <View style={styles.formRow}>
              <Feather name="hash" size={16} color={BrandColors.textSecondary} />
              <TextInput
                style={styles.formInput}
                value={form.transactionRef}
                onChangeText={form.setTransactionRef}
                placeholder="Transaction Reference (optional)"
                placeholderTextColor={BrandColors.textSecondary}
                accessibilityLabel="Transaction reference"
              />
            </View>

            <View style={styles.formDivider} />

            {/* Remarks */}
            <View style={styles.formRow}>
              <Feather name="message-square" size={16} color={BrandColors.textSecondary} />
              <TextInput
                style={[styles.formInput, styles.remarksInput]}
                value={form.remarks}
                onChangeText={form.setRemarks}
                placeholder="Remarks (optional)"
                placeholderTextColor={BrandColors.textSecondary}
                multiline
                numberOfLines={2}
                accessibilityLabel="Remarks"
              />
            </View>
          </View>
        </BillingSection>
      </ScrollView>

      {/* Sticky review button */}
      <View style={styles.footer}>
        <Pressable
          onPress={form.showReview}
          disabled={!form.isValid}
          style={[styles.reviewBtn, !form.isValid && styles.reviewBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !form.isValid }}
        >
          <Typography variant="bodySmallBold" style={styles.reviewBtnText}>
            Review Payment
          </Typography>
          <Feather name="arrow-right" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Review bottom sheet */}
      <AppBottomSheet
        visible={form.isReviewVisible}
        title="Confirm Payment"
        subtitle={`Settling ${selectedBills.length} bill${selectedBills.length !== 1 ? 's' : ''} for ${memberName ?? 'member'}`}
        onClose={form.hideReview}
      >
        <View style={styles.reviewContent}>
          <PaymentSummaryCard
            rows={[
              ...summaryRows,
              {
                label: 'Total',
                amount: form.totalAmount,
                bold: true,
                color: BrandColors.teal,
              },
            ]}
          />

          <View style={styles.reviewMeta}>
            <View style={styles.reviewMetaRow}>
              <Typography variant="caption" color="textSecondary">Method</Typography>
              <PaymentMethodBadge method={form.paymentMethod} />
            </View>
            <View style={styles.reviewMetaRow}>
              <Typography variant="caption" color="textSecondary">Date</Typography>
              <Typography variant="bodySmall">{form.paymentDate}</Typography>
            </View>
            {form.transactionRef ? (
              <View style={styles.reviewMetaRow}>
                <Typography variant="caption" color="textSecondary">Ref</Typography>
                <Typography variant="bodySmall">{form.transactionRef}</Typography>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={settlePayment.isPending}
            style={[styles.confirmBtn, settlePayment.isPending && styles.confirmBtnLoading]}
            accessibilityRole="button"
          >
            {settlePayment.isPending ? (
              <Typography variant="bodySmallBold" style={styles.confirmBtnText}>
                Processing…
              </Typography>
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#ffffff" />
                <Typography variant="bodySmallBold" style={styles.confirmBtnText}>
                  Confirm Payment
                </Typography>
              </>
            )}
          </Pressable>
        </View>
      </AppBottomSheet>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: 100,
  },
  billsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  billRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  billInfo: {
    flex: 1,
    gap: 2,
  },
  billNo: {
    fontWeight: '600',
    fontSize: 13,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: 100,
  },
  currencySymbol: {
    color: BrandColors.textSecondary,
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 14,
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1.5,
    borderTopColor: '#e5e7eb',
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  methodChip: {
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  methodChipActive: {
    borderColor: BrandColors.teal,
    borderRadius: Radius.sm,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  formInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  remarksInput: {
    minHeight: 48,
    textAlignVertical: 'top',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reviewBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontSize: 15,
  },
  reviewContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  reviewMeta: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmBtnLoading: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
  },
});
