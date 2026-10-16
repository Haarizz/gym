import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { EmptyState } from '@/shared/components/EmptyState';
import { useTrainerLedger } from '../../hooks/useTrainerLedger';
import { TrainerLedgerSummaryCard } from '../components/TrainerLedgerSummaryCard';
import { TrainerLedgerStatsGrid } from '../components/TrainerLedgerStatsGrid';
import { TrainerLedgerBreakdownSection } from '../components/TrainerLedgerBreakdownSection';
import { TrainerLedgerTransactionsSection } from '../components/TrainerLedgerTransactionsSection';
import { TrainerLedgerTaxSection } from '../components/TrainerLedgerTaxSection';

import { useTranslation } from 'react-i18next';

type LedgerTab = 'breakdown' | 'transactions' | 'tax';

export function TrainerLedgerScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LedgerTab>('breakdown');
  const { data, isLoading, isError, refetch, isRefetching } = useTrainerLedger();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message={t('ledger.loading')} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loaderContainer}>
        <EmptyState
          icon="alert-circle"
          title={t('ledger.errorTitle')}
          description={isError ? t('ledger.errorNetwork') : t('ledger.errorEmpty')}
          buttonLabel={t('ledger.retry')}
          onPress={() => refetch()}
        />
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
            {t('ledger.tabs.breakdown')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'transactions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text
            style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}
          >
            {t('ledger.tabs.transactions')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'tax' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tax')}
        >
          <Text style={[styles.tabText, activeTab === 'tax' && styles.tabTextActive]}>
            {t('ledger.tabs.tax')}
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'breakdown' && (
        <TrainerLedgerBreakdownSection
          breakdown={data.breakdown}
          summary={data.summary}
          growth={data.quickStats.growth}
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
