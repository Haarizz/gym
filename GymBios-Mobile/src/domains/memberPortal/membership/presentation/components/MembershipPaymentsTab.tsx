import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate, tOr } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import { ReceiptBottomSheet } from '@/shared/components/ReceiptBottomSheet';
import { useMembershipPayments } from '../../hooks/useMembershipPayments';

export function MembershipPaymentsTab() {
  const { t } = useTranslation();
  const { data: payments, isLoading, isError } = useMembershipPayments();
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      {/* Payment History */}
      <GlassSurface radius={Radius.lg} style={styles.card}>
        <Text style={styles.cardTitle}>{t('membership.payments.historyTitle')}</Text>
        
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={BrandColors.teal} />
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t('membership.payments.loadError')}</Text>
          </View>
        )}

        {!isLoading && !isError && payments?.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.metaText}>{t('membership.payments.empty')}</Text>
          </View>
        )}

        {!isLoading && !isError && payments && payments.length > 0 && (
          <View style={styles.historyList}>
            {payments.map((item) => {
              const formattedDate = item.transactionDate
                ? formatDate(item.transactionDate, 'PP')
                : t('membership.status.notAvailable');

              const displayAmount = item.paidAmount ?? item.amount ?? 0;
              const discount = Number(item.discountAmount) || 0;

              return (
                <Pressable key={item.id} style={styles.paymentRow} onPress={() => setSelectedReceiptId(item.id)}>
                  <View>
                    <Text style={styles.amountText}><CurrencyValue amount={displayAmount} /></Text>
                    <Text style={styles.metaText}>
                      {formattedDate} • {item.paymentMethod || item.transactionType}
                    </Text>
                    {discount > 0 && (
                      <View style={styles.discountTag}>
                        <Feather name="tag" size={11} color={BrandColors.teal} />
                        <Text style={styles.discountTagText} numberOfLines={1}>
                          {item.discountLabel || t('membership.payments.discount')} · -<CurrencyValue amount={discount} />
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    item.status === 'Paid' ? styles.statusPaid : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === 'Paid' ? styles.statusPaidText : styles.statusPendingText
                    ]}>
                      {tOr(`membership.payments.statusValues.${item.status}`, item.status)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </GlassSurface>

      {/* Payment Method Card */}
      <GlassSurface radius={Radius.lg} style={styles.card}>
        <Text style={styles.cardTitle}>{t('membership.payments.savedMethodTitle')}</Text>
        <View style={styles.emptyStateBox}>
          <Feather name="info" size={20} color={BrandColors.textSecondary} />
          <Text style={styles.emptyStateText}>
            {t('membership.payments.savedMethodUnavailable')}
          </Text>
        </View>
      </GlassSurface>

      <ReceiptBottomSheet
        visible={selectedReceiptId !== null}
        onClose={() => setSelectedReceiptId(null)}
        receiptId={selectedReceiptId}
        accentColor={BrandColors.memberGold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  center: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: BrandColors.trainerAmber,
    fontSize: 14,
  },
  card: {
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  historyList: {
    gap: Spacing.three,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  discountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: `${BrandColors.teal}15`,
  },
  discountTagText: {
    fontSize: TypographyScale.small,
    color: BrandColors.teal,
    fontWeight: '600',
    flexShrink: 1,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  metaText: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPaidText: {
    color: '#15803D',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#B45309',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyStateBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: '#F8FAFC',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.one,
  },
  emptyStateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.textSecondary,
  },
});
