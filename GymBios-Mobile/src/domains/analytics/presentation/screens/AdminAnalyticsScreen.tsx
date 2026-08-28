import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Text } from 'react-native';
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

export function AdminAnalyticsScreen() {
  const { data: analytics, isLoading, isError } = useAdminAnalytics();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

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
        <Text style={styles.errorText}>Failed to load analytics data.</Text>
      </View>
    );
  }

  const renderOverviewTab = () => (
    <>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Revenue Growth"
          value={`+${analytics.overview.revenueGrowth}%`}
          subtitle="vs last month"
          icon="trending-up"
          iconColor="#16a34a"
          iconBgColor="#dcfce7"
        />
        <MetricCard
          title="Member Growth"
          value={`+${analytics.overview.memberGrowth}%`}
          subtitle="vs last month"
          icon="users"
          iconColor="#2563eb"
          iconBgColor="#dbeafe"
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Churn Rate"
          value={`${analytics.overview.churnRate}%`}
          subtitle={`${analytics.overview.churnImprovement}% improvement`}
          icon="trending-down"
          iconColor="#ea580c"
          iconBgColor="#ffedd5"
          subtitleColor="#16a34a"
        />
        <MetricCard
          title="Avg Revenue"
          value={`₹${(analytics.overview.averageRevenuePerMember / 1000).toFixed(1)}K`}
          subtitle="per member"
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
      <Stack.Screen options={{ title: 'Analytics', headerShadowVisible: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
    paddingBottom: Spacing.six,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
});
