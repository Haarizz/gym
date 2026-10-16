import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { tOr } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { OutstandingBalance } from '../../domain/types';
import { payBlockedMessage } from '../../domain/settlementRules';

const MAX_2DP = { maximumFractionDigits: 2 };

interface OutstandingBalanceCardProps {
  balance: OutstandingBalance;
  onPay: () => void;
}

/**
 * Membership amount / paid / remaining for a membership with an outstanding
 * balance. "Complete Payment" only appears when the backend says it's payable.
 */
export function OutstandingBalanceCard({ balance, onPay }: OutstandingBalanceCardProps) {
  const { t } = useTranslation();
  const blockedMessage = balance.canPay ? null : payBlockedMessage(balance.payBlockedReason);

  return (
    <GlassSurface radius={Radius.lg} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="alert-circle" size={18} color={BrandColors.trainerAmber} />
          <Text style={styles.title}>{balance.planName || t('outstanding.subscription')}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{tOr(`outstanding.statusValues.${balance.paymentStatus}`, balance.paymentStatus)}</Text>
        </View>
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCell}>
          <CurrencyValue style={styles.amount} amount={balance.totalAmount} options={MAX_2DP} />
          <Text style={styles.amountLabel}>{t('outstanding.membershipAmount')}</Text>
        </View>
        <View style={styles.amountCell}>
          <CurrencyValue style={styles.amount} amount={balance.paidAmount} options={MAX_2DP} />
          <Text style={styles.amountLabel}>{t('outstanding.paid')}</Text>
        </View>
        <View style={styles.amountCell}>
          <CurrencyValue style={[styles.amount, styles.remaining]} amount={balance.outstandingAmount} options={MAX_2DP} />
          <Text style={styles.amountLabel}>{t('outstanding.remainingBalance')}</Text>
        </View>
      </View>

      {balance.canPay ? (
        <Pressable
          style={({ pressed }) => [styles.payButton, pressed && styles.pressed]}
          onPress={onPay}
          accessibilityRole="button"
          accessibilityLabel={t('outstanding.completePayment')}
        >
          <Feather name="credit-card" size={18} color="#fff" />
          <Text style={styles.payButtonText}>{t('outstanding.completePayment')}</Text>
        </Pressable>
      ) : blockedMessage ? (
        <Text style={styles.blockedText}>{blockedMessage}</Text>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1.5,
    borderColor: BrandColors.trainerAmber,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  amountsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  amountCell: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  remaining: {
    color: '#d4183d',
  },
  amountLabel: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  blockedText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
