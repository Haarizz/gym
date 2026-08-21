import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerRecentTransaction } from '../../domain/TrainerLedgerData';

interface TrainerLedgerTransactionsSectionProps {
  recentTransactions: TrainerRecentTransaction[];
  onDownloadReport?: () => void;
  onViewDetails?: () => void;
}

export function TrainerLedgerTransactionsSection({
  recentTransactions,
  onDownloadReport,
  onViewDetails,
}: TrainerLedgerTransactionsSectionProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Recent Transactions Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Transactions</Text>
          <Pressable hitSlop={8}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {recentTransactions.map((transaction) => {
            const isPaid = transaction.status === 'paid';
            return (
              <View key={transaction.id} style={styles.item}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDescription}>{transaction.description}</Text>
                    <Text style={styles.itemMember}>{transaction.member}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid ? styles.badgePaid : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPaid ? styles.textPaid : styles.textPending,
                      ]}
                    >
                      {transaction.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemBottomRow}>
                  <Text style={styles.dateText}>{formatDate(transaction.date)}</Text>
                  <Text style={styles.amountText}>₹{transaction.amount.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Action Buttons Grid */}
      <View style={styles.actionsGrid}>
        <Pressable
          style={[styles.actionBtn, { borderColor: BrandColors.trainerAmber }]}
          onPress={onDownloadReport}
          accessibilityRole="button"
          accessibilityLabel="Download Report"
        >
          <Feather name="download" size={20} color={BrandColors.trainerAmber} />
          <Text style={[styles.actionBtnText, { color: BrandColors.trainerAmber }]}>
            Download Report
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: BrandColors.teal }]}
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View Details"
        >
          <Feather name="eye" size={20} color={BrandColors.teal} />
          <Text style={[styles.actionBtnText, { color: BrandColors.teal }]}>
            View Details
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.trainerAmber,
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemMember: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgePaid: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  badgePending: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FEF08A',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textPaid: {
    color: '#15803D',
  },
  textPending: {
    color: '#A16207',
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
