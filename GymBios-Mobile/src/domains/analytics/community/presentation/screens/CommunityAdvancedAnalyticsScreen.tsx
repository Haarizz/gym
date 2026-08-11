import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BottomTabInset, BrandColors, Spacing } from '@/core/theme';
import { EmptyState, Loader } from '@/shared/components';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';

import { useCommunityAdvancedAnalyticsData } from '../../application/useCommunityAdvancedAnalyticsData';
import {
  AdvancedAnalyticsHeader,
  AdvancedAnalyticsTab,
  AdvancedAnalyticsTabs,
  AIRecommendations,
  ChurnPrediction,
  CommunityEngagement,
  Profitability,
  TrainerPerformance,
} from '../components';

export function CommunityAdvancedAnalyticsScreen() {
  const [selectedTab, setSelectedTab] = useState<AdvancedAnalyticsTab>('churn');
  const { data, isLoading, isError, isRefetching, refetch } = useCommunityAdvancedAnalyticsData();

  if (isLoading && !data) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <Loader message="Loading advanced analytics..." />
        </View>
      </ScreenLayout>
    );
  }

  if (isError && !data) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <EmptyState
            icon="wifi-off"
            title="Could not load advanced analytics"
            description="Check your network connection and try again."
            buttonLabel="Retry"
            onPress={() => refetch()}
          />
        </View>
      </ScreenLayout>
    );
  }

  const renderActiveSection = () => {
    switch (selectedTab) {
      case 'churn':
        return <ChurnPrediction churnData={data?.churnPrediction} />;
      case 'trainer':
        return <TrainerPerformance trainerData={data?.trainerPerformance} />;
      case 'engagement':
        return <CommunityEngagement engagementData={data?.engagementAnalytics} />;
      case 'profitability':
        return <Profitability profitabilityData={data?.profitability} />;
      default:
        return null;
    }
  };

  return (
    <ScreenLayout>
      <AdvancedAnalyticsHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >

        <View style={styles.sectionContainer}>
          <AdvancedAnalyticsTabs
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
          />

          {renderActiveSection()}

          <AIRecommendations recommendations={data?.recommendations} />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  sectionContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
