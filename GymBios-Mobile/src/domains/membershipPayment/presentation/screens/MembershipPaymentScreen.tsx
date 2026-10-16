import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
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
  const { t } = useTranslation();
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
      toast.error(built.error, { title: t('outstanding.notAcceptedTitle') });
      return;
    }
    settlement.settle(built.request);
  };

  // The sheet steps aside once the backend has answered definitively, so the
  // member sees the confirmation or the refreshed balance behind it.
  const sheetVisible = isSheetOpen && !settlement.isSuccess && settleError?.kind !== 'conflict';

  const header = (
    <AppHeader
      title={t('outstanding.screenTitle')}
      subtitle={t('outstanding.screenSubtitle')}
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
          title={t('outstanding.notAvailableTitle')}
          message={t('outstanding.notAvailable')}
          actionLabel={t('outstanding.goToMembership')}
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
          title={t('outstanding.loadErrorTitle')}
          message={t('outstanding.loadError')}
          actionLabel={t('outstanding.retry')}
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
            title={t('outstanding.recordedTitle')}
            message={
              (settlement.result.receiptNo
                ? t('outstanding.appliedWithReceipt', {
                    amount: formatAmount(settlement.result.amountPaid),
                    receipt: settlement.result.receiptNo,
                  })
                : t('outstanding.applied', { amount: formatAmount(settlement.result.amountPaid) })) +
              ' ' +
              (settlement.result.outstandingAmount > 0
                ? t('outstanding.remainingAfter', { amount: formatAmount(settlement.result.outstandingAmount) })
                : t('outstanding.fullyPaid'))
            }
            actionLabel={t('outstanding.backToMembership')}
            onAction={goToMembership}
          />
        ) : balance.outstandingAmount <= 0 ? (
          <StatusPanel
            icon="check-circle"
            tone="success"
            title={t('outstanding.nothingToPayTitle')}
            message={t('outstanding.fullyPaid')}
            actionLabel={t('outstanding.backToMembership')}
            onAction={goToMembership}
          />
        ) : (
          <>
            <GlassSurface radius={Radius.lg} style={styles.summary}>
              <Text style={styles.planName}>{balance.planName || t('outstanding.membership')}</Text>
              <SummaryRow label={t('outstanding.membershipAmount')} value={<CurrencyValue amount={balance.totalAmount} options={MAX_2DP} />} />
              <SummaryRow label={t('outstanding.paid')} value={<CurrencyValue amount={balance.paidAmount} options={MAX_2DP} />} />
              <View style={styles.divider} />
              <SummaryRow label={t('outstanding.remainingBalance')} value={<CurrencyValue amount={balance.outstandingAmount} options={MAX_2DP} />} emphasis />
            </GlassSurface>

            {balance.bills.length > 1 ? (
              <GlassSurface radius={Radius.lg} style={styles.summary}>
                <Text style={styles.sectionTitle}>{t('outstanding.unpaidBills')}</Text>
                {balance.bills.map((bill) => (
                  <SummaryRow
                    key={bill.receiptId}
                    label={bill.invoiceNo || bill.planName || bill.transactionType || t('outstanding.billFallback', { id: bill.receiptId })}
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
                {payBlockedMessage(balance.payBlockedReason) ?? t('outstanding.cantPayInApp')}
              </Text>
            ) : settleError?.kind === 'network' ? (
              <Button title={t('outstanding.retryPayment')} loading={settlement.isPending} onPress={settlement.retry} />
            ) : (
              <Button
                title={
                  <Trans
                    i18nKey="outstanding.pay"
                    components={{ amount: <CurrencyValue amount={balance.payableAmount} options={MAX_2DP} /> }}
                  />
                }
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
          title={t('outstanding.completePayment')}
          subtitle={t('outstanding.sheetSubtitle', { amount: formatAmount(balance.payableAmount) })}
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
