import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useStaffLedger } from '../../hooks/useStaffLedger';
import { staffLedgerRepository } from '../../infrastructure/ApiStaffLedgerRepository';
import type { TaxDocument } from '../../domain/StaffLedgerData';
import { StaffLedgerSummaryCard } from '../components/StaffLedgerSummaryCard';
import { StaffLedgerStatsGrid } from '../components/StaffLedgerStatsGrid';
import { StaffLedgerBreakdownSection } from '../components/StaffLedgerBreakdownSection';
import { StaffLedgerEarningsSection } from '../components/StaffLedgerEarningsSection';
import { StaffLedgerTaxSection } from '../components/StaffLedgerTaxSection';

import { toast } from '@/shared/components/Toasts/toastStore';

type LedgerTab = 'breakdown' | 'earnings' | 'tax';

export function StaffLedgerScreen() {
  const [activeTab, setActiveTab] = useState<LedgerTab>('breakdown');
  const { data, isLoading, refetch, isRefetching } = useStaffLedger();

  const handleDownloadSalarySlip = async () => {
    try {
      await staffLedgerRepository.downloadSalarySlip();
      toast.info('Your salary slip advice has been generated successfully.', {
        title: 'Salary Slip Ready'
      });
    } catch (err) {
      toast.info('Your salary slip advice is being prepared by HR.', {
        title: 'Download Notice'
      });
    }
  };

  const handleDocumentPress = async (doc: TaxDocument) => {
    try {
      await staffLedgerRepository.downloadTaxDocument(doc.id);
      toast.info(`${doc.title} is ready for viewing.`, {
        title: 'Tax Document Ready'
      });
    } catch (err) {
      toast.info(`${doc.title} will be provided once filed by the compliance team.`, {
        title: 'Document Notice'
      });
    }
  };

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading ledger..." />
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
            Breakdown
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'earnings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text
            style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}
          >
            Earnings
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
