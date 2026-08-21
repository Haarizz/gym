import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { useMembershipPayments } from '../../hooks/useMembershipPayments';

export function MembershipPaymentsTab() {
  const { data: payments, isLoading, isError } = useMembershipPayments();

  return (
    <View style={styles.container}>
      {/* Payment History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment History</Text>
        
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={BrandColors.teal} />
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load payments.</Text>
          </View>
        )}

        {!isLoading && !isError && payments?.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.metaText}>No payment history found.</Text>
          </View>
        )}

        {!isLoading && !isError && payments && payments.length > 0 && (
          <View style={styles.historyList}>
            {payments.map((item) => {
              const formattedDate = item.transactionDate 
                ? new Date(item.transactionDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';

              const displayAmount = item.paidAmount ?? item.amount ?? 0;

              return (
                <View key={item.id} style={styles.paymentRow}>
                  <View>
                    <Text style={styles.amountText}>₹{displayAmount.toLocaleString()}</Text>
                    <Text style={styles.metaText}>
                      {formattedDate} • {item.paymentMethod || item.transactionType}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    item.status === 'Paid' ? styles.statusPaid : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === 'Paid' ? styles.statusPaidText : styles.statusPendingText
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Payment Method Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved Payment Method</Text>
        <View style={styles.emptyStateBox}>
          <Feather name="info" size={20} color={BrandColors.textSecondary} />
          <Text style={styles.emptyStateText}>
            Saved payment methods are currently unavailable. Please use a new payment method during checkout.
          </Text>
        </View>
      </View>
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
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
