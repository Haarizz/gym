import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GlassBlob, GlassSurface } from '@/shared/components';

import { useMyTransactions } from '../../hooks/useMyTransactions';
import { TransactionCard } from '../components/TransactionCard';

interface TransactionsScreenProps {
  onBack: () => void;
}

export function TransactionsScreen({ onBack }: TransactionsScreenProps) {
  const { transactions, summary, isLoading } = useMyTransactions();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <AppHeader
        title="Transactions"
        subtitle="Salary, purchases & payment activity"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Transaction Summary Header Tiles */}
        <View style={styles.summaryGrid}>
          <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#16a34a' }]}>
              ${summary.totalEarnings.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Total Earnings
            </Typography>
          </GlassSurface>

          <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
            <Typography variant="subtitle" style={styles.summaryValue}>
              {summary.totalTransactions}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Transactions
            </Typography>
          </GlassSurface>

          <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#7c3aed' }]}>
              {summary.totalPurchases}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Purchases
            </Typography>
          </GlassSurface>

          <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
            <Typography variant="subtitle" style={[styles.summaryValue, { color: '#d97706' }]}>
              {summary.totalBonuses}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Bonuses
            </Typography>
          </GlassSurface>
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
    padding: Spacing.three,
    alignItems: 'center',
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
