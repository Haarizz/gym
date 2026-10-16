import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { EmptyState } from '@/shared/components/EmptyState';
import { useStaffLedger } from '../../hooks/useStaffLedger';
import { staffLedgerRepository } from '../../infrastructure/ApiStaffLedgerRepository';
import type { TaxDocument } from '../../domain/StaffLedgerData';
import { StaffLedgerSummaryCard } from '../components/StaffLedgerSummaryCard';
import { StaffLedgerStatsGrid } from '../components/StaffLedgerStatsGrid';
import { StaffLedgerBreakdownSection } from '../components/StaffLedgerBreakdownSection';
import { StaffLedgerEarningsSection } from '../components/StaffLedgerEarningsSection';
import { StaffLedgerTaxSection } from '../components/StaffLedgerTaxSection';

import { toast } from '@/shared/components/Toasts/toastStore';

import { useTranslation } from 'react-i18next';

type LedgerTab = 'breakdown' | 'earnings' | 'tax';

export function StaffLedgerScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LedgerTab>('breakdown');
  const { data, isLoading, isError, refetch, isRefetching } = useStaffLedger();

  const handleDownloadSalarySlip = async () => {
    try {
      await staffLedgerRepository.downloadSalarySlip();
      toast.info(t('ledger.earnings.salarySlipSuccessDesc'), {
        title: t('ledger.earnings.salarySlipSuccessTitle'),
      });
    } catch (err) {
      toast.info(t('ledger.earnings.salarySlipNoticeDesc'), {
        title: t('ledger.earnings.salarySlipNoticeTitle'),
      });
    }
  };

  const handleDocumentPress = async (doc: TaxDocument) => {
    try {
      await staffLedgerRepository.downloadTaxDocument(doc.id);
      toast.info(t('ledger.earnings.taxDocSuccessDesc', { title: doc.title }), {
        title: t('ledger.earnings.taxDocSuccessTitle'),
      });
    } catch (err) {
      toast.info(t('ledger.earnings.taxDocNoticeDesc', { title: doc.title }), {
        title: t('ledger.earnings.taxDocNoticeTitle'),
      });
    }
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
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={BrandColors.teal}
          colors={[BrandColors.teal]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <StaffLedgerSummaryCard summary={data.summary} />
      <StaffLedgerStatsGrid stats={data.quickStats} />

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
          style={[styles.tabButton, activeTab === 'earnings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text
            style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}
          >
            {t('ledger.tabs.earnings')}
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
        <StaffLedgerBreakdownSection
          breakdown={data.breakdown}
          commissionStructure={data.commissionStructure}
        />
      )}

      {activeTab === 'earnings' && (
        <StaffLedgerEarningsSection
          recentEarnings={data.recentEarnings}
          onDownloadSalarySlip={handleDownloadSalarySlip}
        />
      )}

      {activeTab === 'tax' && (
        <StaffLedgerTaxSection
          taxInfo={data.taxInfo}
          taxDocuments={data.taxDocuments}
          onDocumentPress={handleDocumentPress}
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
