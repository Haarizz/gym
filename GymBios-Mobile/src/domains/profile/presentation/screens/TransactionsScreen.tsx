import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, Colors } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GlassBlob, GlassHeader, GlassSurface } from '@/shared/components';
import { ReceiptBottomSheet } from '@/shared/components/ReceiptBottomSheet';

import { useAuthStore } from '@/domains/auth';
import { useMyTransactions } from '../../hooks/useMyTransactions';
import { TransactionCard } from '../components/TransactionCard';

interface TransactionsScreenProps {
  onBack: () => void;
}

export function TransactionsScreen({ onBack }: TransactionsScreenProps) {
  const { t } = useTranslation();
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const appRole = useAuthStore((s) => s.appRole);
  const accentColor = Colors.light[appRole ?? 'admin'];

  const { transactions, summary, isLoading } = useMyTransactions();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <GlassHeader
        title={t('transactions.title')}
        subtitle={t('transactions.subtitle')}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Transaction Summary Header Tiles — only shown when they have something to report */}
        {!!(summary?.totalEarnings || summary?.totalTransactions || summary?.totalPurchases || summary?.totalBonuses) && (
        <View style={styles.summaryGrid}>
          {!!summary?.totalEarnings && (
            <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
              <Typography variant="subtitle" style={[styles.summaryValue, { color: '#16a34a' }]}>
                <CurrencyValue amount={summary.totalEarnings} />
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('transactions.totalEarnings')}
              </Typography>
            </GlassSurface>
          )}

          {!!summary?.totalTransactions && (
            <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
              <Typography variant="subtitle" style={styles.summaryValue}>
                {summary.totalTransactions}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('transactions.transactions')}
              </Typography>
            </GlassSurface>
          )}

          {!!summary?.totalPurchases && (
            <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
              <Typography variant="subtitle" style={[styles.summaryValue, { color: '#7c3aed' }]}>
                {summary.totalPurchases}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('transactions.purchases')}
              </Typography>
            </GlassSurface>
          )}

          {!!summary?.totalBonuses && (
            <GlassSurface radius={Radius.lg} style={styles.summaryTile}>
              <Typography variant="subtitle" style={[styles.summaryValue, { color: '#d97706' }]}>
                {summary.totalBonuses}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('transactions.bonuses')}
              </Typography>
            </GlassSurface>
          )}
        </View>
        )}

        {/* Transactions List */}
        <Typography variant="subtitle" style={styles.listHeader}>
          {t('transactions.recentActivity')}
        </Typography>

        {isLoading ? (
          <Loader />
        ) : transactions.length === 0 ? (
          <EmptyState title={t('transactions.emptyTitle')} description={t('transactions.emptyDescription')} />
        ) : (
          <GlassSurface radius={Radius.lg} style={styles.listCard}>
            {transactions.map((tx, index) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                divider={index > 0}
                onPress={tx.id.startsWith('REC-') ? () => {
                  const receiptId = parseInt(tx.id.replace('REC-', ''), 10);
                  if (!isNaN(receiptId)) setSelectedReceiptId(receiptId);
                } : undefined}
              />
            ))}
          </GlassSurface>
        )}
      </ScrollView>

      <ReceiptBottomSheet
        visible={selectedReceiptId !== null}
        onClose={() => setSelectedReceiptId(null)}
        receiptId={selectedReceiptId}
        accentColor={accentColor}
      />
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
  listCard: {
    padding: Spacing.four,
  },
});
