import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useTrainerLedger } from '../../hooks/useTrainerLedger';
import { TrainerLedgerSummaryCard } from '../components/TrainerLedgerSummaryCard';
import { TrainerLedgerStatsGrid } from '../components/TrainerLedgerStatsGrid';
import { TrainerLedgerBreakdownSection } from '../components/TrainerLedgerBreakdownSection';
import { TrainerLedgerTransactionsSection } from '../components/TrainerLedgerTransactionsSection';
import { TrainerLedgerTaxSection } from '../components/TrainerLedgerTaxSection';

type LedgerTab = 'breakdown' | 'transactions' | 'tax';

export function TrainerLedgerScreen() {
  const [activeTab, setActiveTab] = useState<LedgerTab>('breakdown');
  const { data, isLoading, refetch, isRefetching } = useTrainerLedger();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading ledger..." />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#64748B' }}>Unable to load ledger data.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={BrandColors.trainerAmber}
          colors={[BrandColors.trainerAmber]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <TrainerLedgerSummaryCard summary={data.summary} />
      <TrainerLedgerStatsGrid stats={data.quickStats} />

      {/* Tabs Control */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'breakdown' && styles.tabButtonActive]}
          onPress={() => setActiveTab('breakdown')}
        >
          <Text
            style={[styles.tabText, activeTab === 'breakdown' && styles.tabTextActive]}
          >
            Breakdown
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'transactions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text
            style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}
          >
            Transactions
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'tax' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tax')}
        >
          <Text style={[styles.tabText, activeTab === 'tax' && styles.tabTextActive]}>
            Tax Info
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'breakdown' && (
        <TrainerLedgerBreakdownSection
          breakdown={data.breakdown}
          summary={data.summary}
        />
      )}

      {activeTab === 'transactions' && (
        <TrainerLedgerTransactionsSection
          recentTransactions={data.recentTransactions}
        />
      )}

      {activeTab === 'tax' && (
        <TrainerLedgerTaxSection
          taxInfo={data.taxInfo}
          taxDocuments={data.taxDocuments}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 40,
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
