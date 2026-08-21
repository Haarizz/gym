import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { RecentEarningTransaction } from '../../domain/StaffLedgerData';

interface StaffLedgerEarningsSectionProps {
  recentEarnings: RecentEarningTransaction[];
  onDownloadSalarySlip?: () => void;
}

export function StaffLedgerEarningsSection({
  recentEarnings,
  onDownloadSalarySlip,
}: StaffLedgerEarningsSectionProps) {
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
      {/* Recent Earnings List */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Earnings</Text>
          <Pressable hitSlop={8}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.earningsList}>
          {recentEarnings.map((item) => {
            const isPaid = item.status === 'paid';
            return (
              <View key={item.id} style={styles.earningItem}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemDetailText}>{item.details}</Text>
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
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemBottomRow}>
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Download Salary Slip Button */}
      <Pressable
        style={styles.downloadButton}
        onPress={onDownloadSalarySlip}
        accessibilityRole="button"
        accessibilityLabel="Download Salary Slip"
      >
        <Feather name="download" size={18} color={BrandColors.teal} />
        <Text style={styles.downloadButtonText}>Download Salary Slip</Text>
      </Pressable>
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
    color: BrandColors.teal,
  },
  earningsList: {
    gap: Spacing.two,
  },
  earningItem: {
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
  itemDetailText: {
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
  downloadButton: {
    borderWidth: 2,
    borderColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
