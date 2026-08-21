import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { UserTransaction } from '../../domain';

interface TransactionCardProps {
  transaction: UserTransaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const isPositive = transaction.type === 'salary' || transaction.type === 'bonus';
  const isPurchase = transaction.type === 'purchase';

  const iconName =
    transaction.type === 'salary'
      ? 'dollar-sign'
      : transaction.type === 'bonus'
        ? 'award'
        : transaction.type === 'attendance'
          ? 'clock'
          : transaction.type === 'purchase'
            ? 'shopping-bag'
            : 'credit-card';

  const iconBg = isPositive ? '#dcfce7' : isPurchase ? '#fee2e2' : '#e0f2fe';
  const iconColor = isPositive ? '#16a34a' : isPurchase ? '#dc2626' : '#0284c7';

  const statusBg = transaction.status === 'completed' ? '#dcfce7' : '#fef9c3';
  const statusColor = transaction.status === 'completed' ? '#166534' : '#854d0e';

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={18} color={iconColor} />
      </View>

      <View style={styles.details}>
        <Typography variant="body" style={styles.description}>
          {transaction.description}
        </Typography>
        <Typography variant="caption" color="textSecondary" style={styles.date}>
          {new Date(transaction.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Typography>
      </View>

      <View style={styles.amountBox}>
        {transaction.amount !== undefined ? (
          <Typography
            variant="subtitle"
            style={[styles.amount, { color: isPurchase ? '#dc2626' : '#16a34a' }]}
          >
            {isPurchase ? '-' : '+'}${transaction.amount.toLocaleString()}
          </Typography>
        ) : (
          <Typography variant="caption" color="textSecondary">
            Verified
          </Typography>
        )}

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Typography variant="caption" style={[styles.statusText, { color: statusColor }]}>
            {transaction.status}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  details: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  date: {
    marginTop: 2,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
