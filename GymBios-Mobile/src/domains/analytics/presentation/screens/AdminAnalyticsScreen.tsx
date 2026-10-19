import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyValue } from '@/core/providers';
import { View, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { Stack } from 'expo-router';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';
import { AnalyticsTabs, AnalyticsTab } from '../components/AnalyticsTabs';
import { AIInsightsCard } from '../components/AIInsightsCard';
import { MetricCard } from '../components/MetricCard';
import { MemberChurnChart } from '../components/MemberChurnChart';
import { RevenueTrendChart } from '../components/RevenueTrendChart';
import { BranchRankingCard } from '../components/BranchRankingCard';
import { ClassUtilizationCard } from '../components/ClassUtilizationCard';
import { TrainerProductivityCard } from '../components/TrainerProductivityCard';
import { AddOnPerformanceCard } from '../components/AddOnPerformanceCard';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AdminAnalyticsScreen() {
  const { t } = useTranslation();
  const { data: analytics, isLoading, isError } = useAdminAnalytics();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </View>
    );
  }

  if (isError || !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{t('analytics.failedToLoad')}</Text>
      </View>
    );
  }

  const renderOverviewTab = () => (
    <>
      <View style={styles.metricsRow}>
        <MetricCard
          title={t('analytics.metrics.revenueGrowth')}
          value={`+${analytics.overview.revenueGrowth}%`}
          subtitle={t('analytics.metrics.vsLastMonth')}
          icon="trending-up"
          iconColor="#16a34a"
          iconBgColor="#dcfce7"
        />
        <MetricCard
          title={t('analytics.metrics.memberGrowth')}
          value={`+${analytics.overview.memberGrowth}%`}
          subtitle={t('analytics.metrics.vsLastMonth')}
          icon="users"
          iconColor="#2563eb"
          iconBgColor="#dbeafe"
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title={t('analytics.metrics.churnRate')}
          value={`${analytics.overview.churnRate}%`}
          subtitle={t('analytics.metrics.improvement', { value: analytics.overview.churnImprovement })}
          icon="trending-down"
          iconColor="#ea580c"
          iconBgColor="#ffedd5"
          subtitleColor="#16a34a"
        />
        <MetricCard
          title={t('analytics.metrics.avgRevenue')}
          value={<CurrencyValue amount={analytics.overview.averageRevenuePerMember} compact />}
          subtitle={t('analytics.metrics.perMember')}
          icon="dollar-sign"
          iconColor="#9333ea"
          iconBgColor="#f3e8ff"
        />
      </View>
      <MemberChurnChart data={analytics.overview.memberVsChurn} />
    </>
  );

  const renderRevenueTab = () => (
    <>
      <RevenueTrendChart data={analytics.revenue.trend} />
      <BranchRankingCard data={analytics.revenue.branchRankings} />
    </>
  );

  const renderOperationsTab = () => (
    <>
      <ClassUtilizationCard data={analytics.operations.classUtilization} />
      <TrainerProductivityCard data={analytics.operations.trainerProductivity} />
      <AddOnPerformanceCard data={analytics.operations.addonPerformance} />
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: t('analytics.title'), headerShadowVisible: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }
        ]}
      >
        <AIInsightsCard insights={analytics.aiInsights} />
        
        <AnalyticsTabs selected={activeTab} onSelect={setActiveTab} />
        
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'operations' && renderOperationsTab()}
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.four,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
});
