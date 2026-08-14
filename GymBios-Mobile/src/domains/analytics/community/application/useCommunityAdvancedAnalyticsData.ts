import { useCallback, useMemo } from 'react';

import { useMembersList } from '@/domains/members';
import { useReceipts } from '@/domains/billing';
import { useBookings } from '@/domains/facilities';
import {
  useExpenseByCategory,
  useFinancialDashboard,
} from '@/domains/financials';
import { useCommunityStats } from '@/domains/community';
import { useStaffTargets } from '@/domains/hr';
import type { Receipt } from '@/domains/billing';

import type {
  CommunityAdvancedAnalyticsData,
  RecommendationItem,
} from '../domain/communityAdvancedAnalyticsData.types';

export function useCommunityAdvancedAnalyticsData() {
  const currentDate = useMemo(() => new Date(), []);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const todayStr = currentDate.toISOString().split('T')[0];
  const startDateStr = new Date(currentDate.getTime() - 30 * 86400000)
    .toISOString()
    .split('T')[0];

  const membersQuery = useMembersList({ page: 1, limit: 3000 });
  const receiptsQuery = useReceipts({ page: 1, limit: 5000 });
  const bookingsQuery = useBookings({
    type: 'class',
    startDate: startDateStr,
    endDate: todayStr,
  });
  const dashboardQuery = useFinancialDashboard();
  const expenseByCategoryQuery = useExpenseByCategory();
  const communityStatsQuery = useCommunityStats();
  const targetsQuery = useStaffTargets({ year, month });

  const isLoading =
    membersQuery.isLoading ||
    receiptsQuery.loading ||
    bookingsQuery.isLoading ||
    dashboardQuery.isLoading ||
    expenseByCategoryQuery.isLoading ||
    communityStatsQuery.isLoading ||
    targetsQuery.isLoading;

  const isError =
    membersQuery.isError &&
    Boolean(receiptsQuery.error) &&
    bookingsQuery.isError &&
    dashboardQuery.isError &&
    expenseByCategoryQuery.isError &&
    communityStatsQuery.isError &&
    targetsQuery.isError;

  const isRefetching =
    membersQuery.isRefetching ||
    receiptsQuery.loading ||
    bookingsQuery.isRefetching ||
    dashboardQuery.isRefetching ||
    expenseByCategoryQuery.isRefetching ||
    communityStatsQuery.isRefetching ||
    targetsQuery.isRefetching;

  const refetch = useCallback(() => {
    membersQuery.refetch();
    receiptsQuery.refresh();
    bookingsQuery.refetch();
    dashboardQuery.refetch();
    expenseByCategoryQuery.refetch();
    communityStatsQuery.refetch();
    targetsQuery.refetch();
  }, [
    membersQuery,
    receiptsQuery,
    bookingsQuery,
    dashboardQuery,
    expenseByCategoryQuery,
    communityStatsQuery,
    targetsQuery,
  ]);

  const data: CommunityAdvancedAnalyticsData | null = useMemo(() => {
    const memberList = membersQuery.data?.content ?? [];
    const receiptList: Receipt[] = receiptsQuery.receipts ?? [];
    const bookingList = bookingsQuery.data ?? [];
    const dashboard = dashboardQuery.data;
    const expenseByCategory = expenseByCategoryQuery.data ?? [];
    const communityStats = communityStatsQuery.data;
    const targets = targetsQuery.data ?? [];

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const householdMembers = memberList.filter(
      (m: any) => !(m.isMinor || m.billedToHead),
    );

    // Churn Prediction
    const churnCandidates = householdMembers.filter(
      (m: any) =>
        m.paymentStatus === 'overdue' ||
        m.status === 'expired' ||
        m.status === 'suspended',
    );

    const daysSince = (iso?: string) => {
      if (!iso) return null;
      const ms = currentDate.getTime() - new Date(iso).getTime();
      return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86400000)) : null;
    };

    const churnPrediction = churnCandidates
      .map((m: any) => {
        let score = 0;
        if (m.paymentStatus === 'overdue') {
          score += 30;
        }
        const expiryRaw = m.endDate;
        const daysExpired = m.status === 'expired' ? daysSince(expiryRaw) : null;
        if (daysExpired !== null) {
          score += Math.min(35, 15 + daysExpired / 2);
        } else if (m.status === 'suspended') {
          score += 30;
        }
        const probability = Math.max(20, Math.min(95, Math.round(score)));
        const risk =
          probability >= 70 ? 'High' : probability >= 45 ? 'Medium' : 'Low';

        return {
          name: m.name,
          risk,
          lastVisit: '—',
          membership: m.membershipType ?? 'Standard',
          probability,
        };
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 8);

    // Trainer Performance
    const trainerMap = new Map<
      string,
      { classes: number; attended: number; revenue: number }
    >();
    bookingList.forEach(b => {
      const trainer = b.trainerName || 'Unknown';
      const rec = trainerMap.get(trainer) || {
        classes: 0,
        attended: 0,
        revenue: 0,
      };
      rec.classes += 1;
      if (b.status === 'checked-in' || b.status === 'confirmed')
        rec.attended += 1;
      rec.revenue += Number(b.price) || 0;
      trainerMap.set(trainer, rec);
    });

    const trainerPerformance = Array.from(trainerMap.entries())
      .map(([name, v]) => ({
        name,
        classes: v.classes,
        attendance:
          v.classes > 0 ? Math.round((v.attended / v.classes) * 100) : 0,
        revenue: Math.round(v.revenue),
        rating: 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // Profitability
    const totalRevenue = dashboard?.totalRevenue ?? 0;
    const totalExpenses = dashboard?.totalExpenses ?? 0;
    const netProfit =
      dashboard?.netIncome ?? (totalRevenue - totalExpenses);
    const profitMargin = dashboard?.profitMargin ?? 0;

    const costBreakdown = expenseByCategory
      .map(e => ({
        name: e.category,
        amount: Math.round(e.amount || 0),
        percentage:
          totalExpenses > 0
            ? Number((((e.amount || 0) / totalExpenses) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const revenuePerMember =
      householdMembers.length > 0 ? totalRevenue / householdMembers.length : 0;

    const revenueByMember = new Map<string, number>();
    receiptList.forEach((r: Receipt) => {
      const key = r.memberDbId ? String(r.memberDbId) : r.memberId || r.memberName || '';
      if (!key) return;
      const amt = Number(r.paidAmount) || 0;
      revenueByMember.set(key, (revenueByMember.get(key) || 0) + amt);
    });

    const lifetimeValue =
      revenueByMember.size > 0
        ? Array.from(revenueByMember.values()).reduce((s, v) => s + v, 0) /
          revenueByMember.size
        : 0;

    const newMembersThisMonth = householdMembers.filter((m: any) => {
      const raw = m.startDate || m.createdAt;
      const ds = raw ? String(raw).split('T')[0] : '';
      return ds.startsWith(monthKey);
    }).length;

    const churnRate =
      householdMembers.length > 0
        ? (churnCandidates.length / householdMembers.length) * 100
        : 0;

    // Engagement Analytics
    const communityFeatures = communityStats?.byType
      ? communityStats.byType.map(t => ({
          feature: t.type.charAt(0).toUpperCase() + t.type.slice(1),
          posts: t.posts,
          likes: t.likes,
          comments: t.comments,
          usage:
            (communityStats.totalPosts ?? 0) > 0
              ? Number(((t.posts / communityStats.totalPosts) * 100).toFixed(1))
              : 0,
        }))
      : [];

    const weeklyActivity = communityStats?.weekly
      ? communityStats.weekly.map(w => ({
          week: w.weekLabel,
          posts: w.posts,
          engagement: w.likes + w.comments,
        }))
      : [];

    // Recommendations
    const recommendations: RecommendationItem[] = [];

    const highRiskCount = churnPrediction.filter(c => c.risk === 'High').length;
    if (highRiskCount > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Attention Needed',
        message: `${highRiskCount} member${highRiskCount === 1 ? '' : 's'} at high risk of churn (overdue payment or expired membership). Immediate outreach recommended.`,
        action: 'Contact Members',
      });
    }

    const institution = targets.find(t => t.scope === 'institution');
    if (institution && (institution.revenueTarget || 0) > 0) {
      const assigned = institution.revenueTarget;
      const achieved = institution.revenueAchieved;
      const progress = institution.percentage;
      recommendations.push(
        progress >= 100
          ? {
              type: 'success',
              title: 'Target Achieved',
              message: `You've reached ${progress.toFixed(1)}% of this month's revenue target. Great work team!`,
              action: 'Celebrate Success',
            }
          : {
              type: 'info',
              title: 'Target Progress',
              message: `You're at ${progress.toFixed(1)}% of this month's revenue target, with ${(assigned - achieved).toLocaleString()} remaining.`,
              action: 'Review Sales Pipeline',
            },
      );
    }

    if (communityFeatures.length > 0) {
      const topType = communityFeatures[0];
      recommendations.push({
        type: 'info',
        title: 'Community Engagement',
        message: `"${topType.feature}" posts make up ${topType.usage.toFixed(0)}% of community activity with ${topType.likes + topType.comments} total interactions. Consider highlighting this content type more.`,
        action: 'Promote Community',
      });
    }

    return {
      churnPrediction,
      trainerPerformance,
      engagementAnalytics: {
        communityFeatures,
        weeklyActivity,
      },
      profitability: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        costBreakdown,
        revenuePerMember,
        lifetimeValue,
        newMembersThisMonth,
        churnRate,
      },
      recommendations,
    };
  }, [
    currentDate,
    month,
    year,
    membersQuery.data,
    receiptsQuery.receipts,
    bookingsQuery.data,
    dashboardQuery.data,
    expenseByCategoryQuery.data,
    communityStatsQuery.data,
    targetsQuery.data,
  ]);

  return {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    errors: {
      members: membersQuery.error,
      receipts: receiptsQuery.error,
      bookings: bookingsQuery.error,
      dashboard: dashboardQuery.error,
      expenseByCategory: expenseByCategoryQuery.error,
      communityStats: communityStatsQuery.error,
      targets: targetsQuery.error,
    },
  };
}
