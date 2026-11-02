import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
import { SalaryAdvanceSection } from '../components/SalaryAdvanceSection';
import { useSalaryAdvances } from '../../hooks/useSalaryAdvances';

import { useTranslation } from 'react-i18next';

type LedgerTab = 'breakdown' | 'transactions' | 'advances';

export function TrainerLedgerScreen() {
  const { t } = useTranslation();
  // ?tab=advances opens the Advances tab (e.g. from an approve/reject notification).
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<LedgerTab>(tab === 'advances' ? 'advances' : 'breakdown');
  // A later notification tap while the screen is open changes the param: follow it.
  const [seenTab, setSeenTab] = useState(tab);
  if (tab !== seenTab) {
    setSeenTab(tab);
    if (tab === 'advances') setActiveTab('advances');
  }
  const { data, isLoading, isError, refetch, isRefetching } = useTrainerLedger();
  const advances = useSalaryAdvances('trainer');
  const refreshAll = () => {
    refetch();
    advances.refetch();
  };

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
          refreshing={isRefetching || advances.isRefetching}
          onRefresh={refreshAll}
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
          style={[styles.tabButton, activeTab === 'advances' && styles.tabButtonActive]}
          onPress={() => setActiveTab('advances')}
        >
          <Text style={[styles.tabText, activeTab === 'advances' && styles.tabTextActive]}>
            {t('ledger.tabs.advances')}
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

      {activeTab === 'advances' && (
        <SalaryAdvanceSection role="trainer" accentColor={BrandColors.trainerAmber} />
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
