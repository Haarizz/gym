import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandColors, Spacing } from '@/core/theme';
import { ReferralHeader } from '../components/ReferralHeader';
import { ReferralAnalyticsFunnel } from '../components/ReferralAnalyticsFunnel';
import { ReferralPerformanceCards } from '../components/ReferralPerformanceCards';
import { ReferralInsightCard } from '../components/ReferralInsightCard';
import { useReferrals, useReferralStats } from '../../hooks/useReferrals';
import { useRewardStats } from '@/domains/rewards';

export function ReferralAnalyticsScreen() {
  const router = useRouter();
  const { data: referralsPage, refetch: refetchReferrals } = useReferrals({ size: 1000 });
  const { data: stats, refetch: refetchStats } = useReferralStats();
  const { data: rewardStats, refetch: refetchRewards } = useRewardStats();
  const [refreshing, setRefreshing] = useState(false);

  const referrals = referralsPage?.referrals ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchReferrals(), refetchStats(), refetchRewards()]);
    setRefreshing(false);
  }, [refetchReferrals, refetchStats, refetchRewards]);

  // Derive deep analytics data directly from domain data
  const analyticsData = useMemo(() => {
    const total = stats?.totalReferrals ?? referrals.length;
    const successful = stats?.successfulReferrals ?? referrals.filter((r) => r.status === 'successful').length;
    const paid = referrals.filter((r) => Boolean(r.paymentDate)).length;
    const redeemed = rewardStats?.redeemed ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthCount = referrals.filter((r) => new Date(r.date || r.createdAt || '') >= startOfMonth).length;
    const lastMonthCount = referrals.filter(
      (r) =>
        new Date(r.date || r.createdAt || '') >= startOfLastMonth &&
        new Date(r.date || r.createdAt || '') < startOfMonth
    ).length;

    const monthGrowthPct =
      lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : thisMonthCount > 0
        ? 100
        : 0;

    const totalRewards = Number(stats?.totalRewards ?? 0);
    const rewardsPaid = Number(rewardStats?.walletCreditsIssued ?? totalRewards);
    const avgValue =
      successful > 0 ? Math.round((totalRewards / successful) * 100) / 100 : 0;
    const redemptionRate =
      successful > 0 ? Math.round((redeemed / successful) * 1000) / 10 : 0;

    const ruleCounts: Record<string, number> = {};
    referrals.forEach((r) => {
      if (r.ruleName) ruleCounts[r.ruleName] = (ruleCounts[r.ruleName] || 0) + 1;
    });
    const topRule = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])[0];

    const conversionRate = stats?.conversionRate ?? (total > 0 ? Math.round((successful / total) * 100) : 0);

    return {
      funnel: { total, successful, paid, redeemed },
      performance: {
        thisMonthCount,
        monthGrowthPct,
        rewardsPaid,
        redeemedCount: redeemed,
        avgValue,
        redemptionRate,
      },
      insights: {
        conversionRate,
        successfulCount: successful,
        totalCount: total,
        topRuleName: topRule?.[0],
        topRuleCount: topRule?.[1] || 0,
        redemptionRate,
        redeemedCount: redeemed,
      },
    };
  }, [referrals, stats, rewardStats]);

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Referral Analytics"
        subtitle="Analyze referral conversion and performance"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        <View style={styles.body}>
          {/* Funnel */}
          <ReferralAnalyticsFunnel data={analyticsData.funnel} />

          {/* Monthly Performance */}
          <ReferralPerformanceCards data={analyticsData.performance} />

          {/* Performance Insights */}
          <ReferralInsightCard data={analyticsData.insights} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
