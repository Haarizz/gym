import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomTabInset, BrandColors, Spacing } from '@/core/theme';
import { EmptyState, Loader } from '@/shared/components';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';

import { useCommunityAnalyticsData } from '../../application/useCommunityAnalyticsData';
import {
  AdvancedAnalyticsEntry,
  CommunityAnalyticsHeader,
  CommunityAnalyticsOverview,
  CommunityCollections,
  CommunityDailyRevenue,
  CommunityMemberJourney,
  CommunityMonthlyPerformance,
  CommunityStaffPerformance,
} from '../components';

export function CommunityAnalyticsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, isRefetching, refetch } = useCommunityAnalyticsData();

  if (isLoading && !data) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <Loader message="Loading community analytics..." />
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
            title="Could not load analytics"
            description="Check your network connection and try again."
            buttonLabel="Retry"
            onPress={() => refetch()}
          />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <CommunityAnalyticsHeader />
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
          <CommunityAnalyticsOverview
            targets={data?.targets}
            collections={data?.collections}
            retentionFunnel={data?.retentionFunnel}
          />

          <CommunityCollections collections={data?.collections} />

          <CommunityDailyRevenue dailyData={data?.trends?.daily} />

          <CommunityMonthlyPerformance monthlyData={data?.trends?.monthly} />

          <CommunityStaffPerformance staffData={data?.staffPerformance} />

          <CommunityMemberJourney funnelData={data?.retentionFunnel} />

          <AdvancedAnalyticsEntry
            onPress={() => router.push('/(admin)/analytics/community-advanced' as never)}
          />
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
    gap: Spacing.four,
  },
});
