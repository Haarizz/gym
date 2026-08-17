import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type LedgerTab = 'breakdown' | 'earnings' | 'tax';

export function StaffLedgerScreen() {
  const [activeTab, setActiveTab] = useState<LedgerTab>('breakdown');
  const { data, isLoading, refetch, isRefetching } = useStaffLedger();

  const handleDownloadSalarySlip = async () => {
    try {
      await staffLedgerRepository.downloadSalarySlip();
      Alert.alert('Salary Slip Ready', 'Your salary slip advice has been generated successfully.');
    } catch (err) {
      Alert.alert('Download Notice', 'Your salary slip advice is being prepared by HR.');
    }
  };

  const handleDocumentPress = async (doc: TaxDocument) => {
    try {
      await staffLedgerRepository.downloadTaxDocument(doc.id);
      Alert.alert('Tax Document Ready', `${doc.title} is ready for viewing.`);
    } catch (err) {
      Alert.alert('Document Notice', `${doc.title} will be provided once filed by the compliance team.`);
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
