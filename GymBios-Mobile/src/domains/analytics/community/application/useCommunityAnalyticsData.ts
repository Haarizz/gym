import { useCallback, useMemo } from 'react';

import { useStaffTargets } from '@/domains/hr';
import { useMembersList } from '@/domains/members';
import { useReceipts } from '@/domains/billing';
import { useFinancialMonthlyTrend } from '@/domains/financials';
import { useCommunityStats } from '@/domains/community';
import type { Receipt } from '@/domains/billing';

import type {
  CollectionCategoryBreakdown,
  CommunityAnalyticsData,
} from '../domain/communityAnalyticsData.types';

const COLORS = {
  primary: '#0047AB',
  secondary: '#009688',
  success: '#4CAF50',
};

export function useCommunityAnalyticsData() {
  const currentDate = useMemo(() => new Date(), []);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const targetsQuery = useStaffTargets({ year, month });
  const membersQuery = useMembersList({ page: 1, limit: 3000 });
  const receiptsQuery = useReceipts({ page: 1, limit: 5000 });
  const monthlyTrendQuery = useFinancialMonthlyTrend(6);
  const communityStatsQuery = useCommunityStats();

  const isLoading =
    targetsQuery.isLoading ||
    membersQuery.isLoading ||
    receiptsQuery.loading ||
    monthlyTrendQuery.isLoading ||
    communityStatsQuery.isLoading;

  const isError =
    targetsQuery.isError &&
    membersQuery.isError &&
    Boolean(receiptsQuery.error) &&
    monthlyTrendQuery.isError &&
    communityStatsQuery.isError;

  const isRefetching =
    targetsQuery.isRefetching ||
    membersQuery.isRefetching ||
    receiptsQuery.loading ||
    monthlyTrendQuery.isRefetching ||
    communityStatsQuery.isRefetching;

  const refetch = useCallback(() => {
    targetsQuery.refetch();
    membersQuery.refetch();
    receiptsQuery.refresh();
    monthlyTrendQuery.refetch();
    communityStatsQuery.refetch();
  }, [
    targetsQuery,
    membersQuery,
    receiptsQuery,
    monthlyTrendQuery,
    communityStatsQuery,
  ]);

  const data: CommunityAnalyticsData | null = useMemo(() => {
    const targets = targetsQuery.data ?? [];
    const memberList = membersQuery.data?.content ?? [];
    const receiptList: Receipt[] = receiptsQuery.receipts ?? [];
    const monthlyTrend = monthlyTrendQuery.data ?? [];

    const todayStr = currentDate.toISOString().split('T')[0];
    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Target Progress
    const institution = targets.find(t => t.scope === 'institution');
    const assigned = institution?.revenueTarget ?? 0;
    const achieved = institution?.revenueAchieved ?? 0;
    const progress =
      institution?.percentage ??
      (assigned > 0 ? (achieved / assigned) * 100 : 0);

    // Helper for revenue calculation
    const revenueOf = (r: Receipt): number => Number(r.paidAmount) || 0;

    // Helper to categorize receipt
    const categorizeReceipt = (r: Receipt): 'membership' | 'addons' | 'pos' => {
      const t = (r.transactionType || '').toLowerCase();
      const plan = (r.planName || '').toLowerCase();
      if (
        t.includes('new') ||
        t.includes('renew') ||
        t.includes('upgrade') ||
        plan.includes('membership')
      )
        return 'membership';
      if (
        t.includes('pos') ||
        plan.includes('pos') ||
        t.includes('product') ||
        plan.includes('product')
      )
        return 'pos';
      return 'addons';
    };

    const sumCollections = (
      datePredicate: (d: string) => boolean,
    ): CollectionCategoryBreakdown => {
      const out: CollectionCategoryBreakdown = {
        membership: 0,
        addons: 0,
        pos: 0,
        total: 0,
      };
      receiptList.forEach((r: Receipt) => {
        const dateStr = (r.transactionDate || '').split('T')[0];
        if (!dateStr || !datePredicate(dateStr)) return;
        const amount = revenueOf(r);
        const cat = categorizeReceipt(r);
        out[cat] += amount;
        out.total += amount;
      });
      return out;
    };

    const collections = {
      today: sumCollections(d => d === todayStr),
      yesterday: sumCollections(d => d === yesterdayStr),
      thisMonth: sumCollections(d => d.startsWith(monthKey)),
    };

    // Daily Revenue Trend (7 days)
    const daily = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() - (6 - idx));
      const ds = d.toISOString().split('T')[0];
      const label = d.toLocaleString(undefined, { weekday: 'short' });
      const revenue = receiptList
        .filter((r: Receipt) => (r.transactionDate || '').split('T')[0] === ds)
        .reduce((s: number, r: Receipt) => s + revenueOf(r), 0);
      const newMembers = memberList.filter(m => {
        const raw = m.startDate || m.createdAt;
        const ms = raw ? String(raw).split('T')[0] : '';
        return ms === ds;
      }).length;
      return { date: label, revenue: Math.round(revenue), members: newMembers };
    });

    // Monthly Performance
    const monthly = monthlyTrend.map(p => ({
      month: p.month,
      revenue: Math.round(p.revenue || 0),
      target: Math.round(p.revenue || 0),
    }));

    // Staff Performance
    const targetsByStaff = new Map<string, number>();
    targets
      .filter(t => t.scope === 'individual')
      .forEach(t => {
        if (!t.staffName) return;
        targetsByStaff.set(
          t.staffName,
          (targetsByStaff.get(t.staffName) || 0) + (t.revenueTarget || 0),
        );
      });

    const staffSales = new Map<string, number>();
    receiptList.forEach((r: Receipt) => {
      const dateStr = (r.transactionDate || '').split('T')[0];
      if (!dateStr.startsWith(monthKey)) return;
      const staffName = r.processedBy || 'Unknown';
      staffSales.set(
        staffName,
        (staffSales.get(staffName) || 0) + revenueOf(r),
      );
    });

    const staffPerformance = Array.from(staffSales.entries())
      .map(([name, sales]) => {
        const target = targetsByStaff.get(name) || 0;
        const achievement = target > 0 ? (sales / target) * 100 : 0;
        return {
          name,
          sales: Math.round(sales),
          target: Math.round(target),
          achievement: Number(achievement.toFixed(1)),
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8);

    // Retention Funnel / Member Journey
    const householdMembers = memberList.filter(
      (m: any) => !(m.isMinor || m.billedToHead),
    );

    const newSignupsThisMonth = householdMembers.filter((m: any) => {
      const raw = m.startDate || m.createdAt;
      const ds = raw ? String(raw).split('T')[0] : '';
      return ds.startsWith(monthKey);
    }).length;

    const activeMembers = memberList.filter(
      m => m.status === 'active' || (m as any).membership_status === 'active',
    ).length;

    const renewalsThisMonth = receiptList.filter((r: Receipt) => {
      const ds = (r.transactionDate || '').split('T')[0];
      return (
        ds.startsWith(monthKey) &&
        (r.transactionType || '').toLowerCase().includes('renew')
      );
    }).length;

    const retentionFunnel = [
      { name: 'New Signups', value: newSignupsThisMonth, color: COLORS.primary },
      { name: 'Active Members', value: activeMembers, color: COLORS.secondary },
      { name: 'Renewals', value: renewalsThisMonth, color: COLORS.success },
    ];

    return {
      targets: { assigned, achieved, progress },
      collections,
      trends: { daily, monthly },
      staffPerformance,
      retentionFunnel,
    };
  }, [
    currentDate,
    month,
    year,
    targetsQuery.data,
    membersQuery.data,
    receiptsQuery.receipts,
    monthlyTrendQuery.data,
  ]);

  return {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    errors: {
      targets: targetsQuery.error,
      members: membersQuery.error,
      receipts: receiptsQuery.error,
      monthlyTrend: monthlyTrendQuery.error,
      communityStats: communityStatsQuery.error,
    },
  };
}
