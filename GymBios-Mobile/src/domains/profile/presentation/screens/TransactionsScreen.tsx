import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';

import { useMyTransactions } from '../../hooks/useMyTransactions';
import { TransactionCard } from '../components/TransactionCard';

interface TransactionsScreenProps {
  onBack: () => void;
}

export function TransactionsScreen({ onBack }: TransactionsScreenProps) {
  const { transactions, summary, isLoading } = useMyTransactions();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Transactions"
        subtitle="Salary, purchases & payment activity"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Transaction Summary Header Tiles */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#16a34a' }]}>
              ${summary.totalEarnings.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Total Earnings
            </Typography>
          </View>

          <View style={styles.summaryTile}>
            <Typography variant="subtitle" style={styles.summaryValue}>
              {summary.totalTransactions}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Transactions
            </Typography>
          </View>

          <View style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#7c3aed' }]}>
              {summary.totalPurchases}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Purchases
            </Typography>
          </View>

          <View style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#d97706' }]}>
              {summary.totalBonuses}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Bonuses
            </Typography>
          </View>
        </View>

        {/* Transactions List */}
        <Typography variant="subtitle" style={styles.listHeader}>
          Recent Activity
        </Typography>

        {isLoading ? (
          <Loader />
        ) : transactions.length === 0 ? (
          <EmptyState title="No Transactions" description="No recent transactions found." />
        ) : (
          transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    color: BrandColors.textPrimary,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
});
