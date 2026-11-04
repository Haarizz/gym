import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/network/apiClient';
import { useBranchContext } from '@/shared/providers/BranchProvider';

/** month = this month to date; each KPI is compared with the previous period of the same length. */
export type AnalyticsPeriod = 'month' | 'last_month' | '3m' | '12m';
export type Granularity = 'day' | 'week' | 'month';

export interface AnalyticsRange {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  granularity: Granularity;
}

export interface Kpi {
  value: number | null;
  previous: number | null;
}

export interface NamedValue {
  name: string;
  value: number;
  count: number;
}

export interface MembershipAnalytics {
  range: AnalyticsRange;
  activeMembers: number;
  newJoins: Kpi;
  renewals: Kpi;
  lost: Kpi;
  membershipRevenue: Kpi;
  renewalRate: number | null;
  expiringIn7Days: number;
  expiringIn30Days: number;
  frozenNow: number;
  freezeCharges: number;
  trend: { bucket: string; newJoins: number; renewals: number; lost: number }[];
  revenueByPlan: NamedValue[];
  addonRevenue: Kpi;
  addonUnits: number;
  addonUptake: number | null;
  topAddons: NamedValue[];
}

export interface BookingsAnalytics {
  range: AnalyticsRange;
  bookings: Kpi;
  revenue: Kpi;
  fillRate: Kpi;
  cancellations: Kpi;
  pendingApprovals: number;
  outcomes: { attended: number; noShow: number; cancelled: number; upcoming: number };
  classFill: { name: string; sessions: number; booked: number; capacity: number; fillRate: number }[];
  /** day 1 = Monday … 7 = Sunday */
  heatmap: { day: number; hour: number; bookings: number }[];
  ptRevenue: number;
  classRevenue: number;
  topTrainers: { name: string; sessions: number; bookings: number; revenue: number }[];
}

export interface PosAnalytics {
  range: AnalyticsRange;
  netSales: Kpi;
  transactions: Kpi;
  averageBill: Kpi;
  grossMargin: Kpi;
  discounts: number;
  returnsCount: number;
  returnsAmount: number;
  outstandingCredit: number;
  trend: { bucket: string; netSales: number; transactions: number }[];
  topProducts: NamedValue[];
  byCategory: NamedValue[];
  paymentMix: NamedValue[];
}

// The API answers in snake_case (global Jackson naming); amounts arrive as numbers or numeric strings.
const n = (v: unknown): number => (v == null ? 0 : Number(v) || 0);
const nOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
const kpi = (raw: any): Kpi => ({ value: nOrNull(raw?.value), previous: nOrNull(raw?.previous) });
const named = (rows: any[] | undefined): NamedValue[] =>
  (rows ?? []).map((r) => ({ name: String(r.name ?? ''), value: n(r.value), count: n(r.count) }));
const range = (raw: any): AnalyticsRange => ({
  period: raw?.period ?? 'month',
  from: raw?.from ?? '',
  to: raw?.to ?? '',
  granularity: raw?.granularity ?? 'day',
});

function mapMembership(raw: any): MembershipAnalytics {
  return {
    range: range(raw.range),
    activeMembers: n(raw.active_members),
    newJoins: kpi(raw.new_joins),
    renewals: kpi(raw.renewals),
    lost: kpi(raw.lost),
    membershipRevenue: kpi(raw.membership_revenue),
    renewalRate: nOrNull(raw.renewal_rate),
    expiringIn7Days: n(raw.expiring_in7_days),
    expiringIn30Days: n(raw.expiring_in30_days),
    frozenNow: n(raw.frozen_now),
    freezeCharges: n(raw.freeze_charges),
    trend: (raw.trend ?? []).map((p: any) => ({
      bucket: p.bucket,
      newJoins: n(p.new_joins),
      renewals: n(p.renewals),
      lost: n(p.lost),
    })),
    revenueByPlan: named(raw.revenue_by_plan),
    addonRevenue: kpi(raw.addon_revenue),
    addonUnits: n(raw.addon_units),
    addonUptake: nOrNull(raw.addon_uptake),
    topAddons: named(raw.top_addons),
  };
}

function mapBookings(raw: any): BookingsAnalytics {
  return {
    range: range(raw.range),
    bookings: kpi(raw.bookings),
    revenue: kpi(raw.revenue),
    fillRate: kpi(raw.fill_rate),
    cancellations: kpi(raw.cancellations),
    pendingApprovals: n(raw.pending_approvals),
    outcomes: {
      attended: n(raw.outcomes?.attended),
      noShow: n(raw.outcomes?.no_show),
      cancelled: n(raw.outcomes?.cancelled),
      upcoming: n(raw.outcomes?.upcoming),
    },
    classFill: (raw.class_fill ?? []).map((c: any) => ({
      name: String(c.name ?? ''),
      sessions: n(c.sessions),
      booked: n(c.booked),
      capacity: n(c.capacity),
      fillRate: n(c.fill_rate),
    })),
    heatmap: (raw.heatmap ?? []).map((c: any) => ({ day: n(c.day), hour: n(c.hour), bookings: n(c.bookings) })),
    ptRevenue: n(raw.pt_revenue),
    classRevenue: n(raw.class_revenue),
    topTrainers: (raw.top_trainers ?? []).map((t: any) => ({
      name: String(t.name ?? ''),
      sessions: n(t.sessions),
      bookings: n(t.bookings),
      revenue: n(t.revenue),
    })),
  };
}

function mapPos(raw: any): PosAnalytics {
  return {
    range: range(raw.range),
    netSales: kpi(raw.net_sales),
    transactions: kpi(raw.transactions),
    averageBill: kpi(raw.average_bill),
    grossMargin: kpi(raw.gross_margin),
    discounts: n(raw.discounts),
    returnsCount: n(raw.returns_count),
    returnsAmount: n(raw.returns_amount),
    outstandingCredit: n(raw.outstanding_credit),
    trend: (raw.trend ?? []).map((p: any) => ({
      bucket: p.bucket,
      netSales: n(p.net_sales),
      transactions: n(p.transactions),
    })),
    topProducts: named(raw.top_products),
    byCategory: named(raw.by_category),
    paymentMix: named(raw.payment_mix),
  };
}

function useAnalyticsQuery<T>(tab: 'membership' | 'bookings' | 'pos', period: AnalyticsPeriod, enabled: boolean, map: (raw: any) => T) {
  // The branch travels in the X-Active-Branch-Id header; it is in the key so a switch refetches.
  const { selectedBranchId } = useBranchContext();
  return useQuery<T>({
    queryKey: ['admin-analytics', tab, period, selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/mobile/admin/analytics/${tab}`, { params: { period } });
      return map(res.data ?? {});
    },
    staleTime: 60_000,
    enabled,
  });
}

export const useMembershipAnalytics = (period: AnalyticsPeriod, enabled = true) =>
  useAnalyticsQuery('membership', period, enabled, mapMembership);
export const useBookingsAnalytics = (period: AnalyticsPeriod, enabled = true) =>
  useAnalyticsQuery('bookings', period, enabled, mapBookings);
export const usePosAnalytics = (period: AnalyticsPeriod, enabled = true) => useAnalyticsQuery('pos', period, enabled, mapPos);
