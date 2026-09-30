import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Button } from '@/shared/components/Button';
import { GlassSurface } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { PaymentBottomSheet } from '@/shared/payment';
import type { PaymentResult } from '@/shared/payment/types';

import { useOutstandingBalance } from '../../hooks/useOutstandingBalance';
import { useSettleOutstandingBalance } from '../../hooks/useSettleOutstandingBalance';
import { buildSettlementRequest, formatAmount, payBlockedMessage } from '../../domain/settlementRules';

const MAX_2DP = { maximumFractionDigits: 2 };

interface MembershipPaymentScreenProps {
  membershipId: number;
}

/**
 * Settles a membership's outstanding balance. Reached from the Membership
 * screen's "Complete Payment" and from the outstanding-balance push
 * notification, so it never trusts what the caller last saw — it always loads
 * the current balance from the backend, and the backend re-checks it again
 * when the payment is submitted.
 */
export function MembershipPaymentScreen({ membershipId }: MembershipPaymentScreenProps) {
  const router = useRouter();
  const validId = Number.isInteger(membershipId) && membershipId > 0;
  const balanceQuery = useOutstandingBalance(validId ? membershipId : undefined);
  const settlement = useSettleOutstandingBalance(membershipId);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const balance = balanceQuery.data;
  const settleError = settlement.error;

  const goToMembership = () => router.replace('/(member)/membership');

  const openSheet = () => {
    settlement.reset();
    setIsSheetOpen(true);
  };

  const handlePaymentEntered = (payment: PaymentResult) => {
    if (!balance) return;
    const built = buildSettlementRequest(balance, payment);
    if (!built.ok) {
      toast.error(built.error, { title: 'Payment not accepted' });
      return;
    }
    settlement.settle(built.request);
  };

  // The sheet steps aside once the backend has answered definitively, so the
  // member sees the confirmation or the refreshed balance behind it.
  const sheetVisible = isSheetOpen && !settlement.isSuccess && settleError?.kind !== 'conflict';

  const header = (
    <AppHeader
      title="Membership Payment"
      subtitle="Outstanding balance"
      colors={[BrandColors.teal, BrandColors.tealDark]}
      onBack={() => (router.canGoBack() ? router.back() : goToMembership())}
    />
  );

  if (!validId || balanceQuery.isNotFound) {
    return (
      <ScreenLayout>
        {header}
        <StatusPanel
          icon="slash"
          title="Payment not available"
          message="This payment isn't linked to your membership. It may belong to a different gym or account."
          actionLabel="Go to Membership"
          onAction={goToMembership}
        />
      </ScreenLayout>
    );
  }

  if (balanceQuery.isLoading) {
    return (
      <ScreenLayout>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BrandColors.teal} />
        </View>
      </ScreenLayout>
    );
  }

  if (balanceQuery.isError || !balance) {
    return (
      <ScreenLayout>
        {header}
        <StatusPanel
          icon="alert-triangle"
          title="Couldn't load your balance"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void balanceQuery.refetch()}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching}
            onRefresh={() => void balanceQuery.refetch()}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        {settlement.isSuccess && settlement.result ? (
          <StatusPanel
            icon="check-circle"
            tone="success"
            title="Payment recorded"
            message={
              `${formatAmount(settlement.result.amountPaid)} was applied to your membership` +
              (settlement.result.receiptNo ? ` (receipt ${settlement.result.receiptNo}).` : '.') +
              (settlement.result.outstandingAmount > 0
                ? ` Remaining balance: ${formatAmount(settlement.result.outstandingAmount)}.`
                : ' Your membership is fully paid.')
            }
            actionLabel="Back to Membership"
            onAction={goToMembership}
          />
        ) : balance.outstandingAmount <= 0 ? (
          <StatusPanel
            icon="check-circle"
            tone="success"
            title="Nothing to pay"
            message="Your membership is fully paid."
            actionLabel="Back to Membership"
            onAction={goToMembership}
          />
        ) : (
          <>
            <GlassSurface radius={Radius.lg} style={styles.summary}>
              <Text style={styles.planName}>{balance.planName || 'Membership'}</Text>
              <SummaryRow label="Membership amount" value={<CurrencyValue amount={balance.totalAmount} options={MAX_2DP} />} />
              <SummaryRow label="Paid" value={<CurrencyValue amount={balance.paidAmount} options={MAX_2DP} />} />
              <View style={styles.divider} />
              <SummaryRow label="Remaining balance" value={<CurrencyValue amount={balance.outstandingAmount} options={MAX_2DP} />} emphasis />
            </GlassSurface>

            {balance.bills.length > 1 ? (
              <GlassSurface radius={Radius.lg} style={styles.summary}>
                <Text style={styles.sectionTitle}>Unpaid bills</Text>
                {balance.bills.map((bill) => (
                  <SummaryRow
                    key={bill.receiptId}
                    label={bill.invoiceNo || bill.planName || bill.transactionType || `Bill ${bill.receiptId}`}
                    value={<CurrencyValue amount={bill.outstandingAmount} options={MAX_2DP} />}
                  />
                ))}
              </GlassSurface>
            ) : null}

            {settleError ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={18} color="#d4183d" />
                <Text style={styles.errorText}>{settleError.message}</Text>
              </View>
            ) : null}

            {!balance.canPay ? (
              <Text style={styles.blockedText}>
                {payBlockedMessage(balance.payBlockedReason) ?? 'This balance can’t be paid in the app.'}
              </Text>
            ) : settleError?.kind === 'network' ? (
              <Button title="Retry payment" loading={settlement.isPending} onPress={settlement.retry} />
            ) : (
              <Button
                title={<>Pay <CurrencyValue amount={balance.payableAmount} options={MAX_2DP} /></>}
                loading={settlement.isPending}
                disabled={balanceQuery.isFetching}
                onPress={openSheet}
              />
            )}
          </>
        )}
      </ScrollView>

      {balance.canPay ? (
        <PaymentBottomSheet
          visible={sheetVisible}
          amount={balance.payableAmount}
          title="Complete Payment"
          subtitle={`Pay your remaining balance of ${formatAmount(balance.payableAmount)}`}
          allowDiscount={false}
          isProcessing={settlement.isPending}
          onClose={() => setIsSheetOpen(false)}
          onComplete={handlePaymentEntered}
        />
      ) : null}
    </ScreenLayout>
  );
}

function SummaryRow({ label, value, emphasis }: { label: string; value: React.ReactNode; emphasis?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowEmphasis]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowEmphasisValue]}>{value}</Text>
    </View>
  );
}

function StatusPanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  tone?: 'neutral' | 'success';
}) {
  return (
    <View style={styles.statusPanel}>
      <Feather name={icon} size={48} color={tone === 'success' ? BrandColors.teal : BrandColors.trainerAmber} />
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
      <Button title={actionLabel} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  summary: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowLabel: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  rowEmphasis: {
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  rowEmphasisValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d4183d',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: Spacing.one,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#FDECEF',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#9F1239',
  },
  blockedText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  statusPanel: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
});
