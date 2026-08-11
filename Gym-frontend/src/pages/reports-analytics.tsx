import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, Calendar, DollarSign, Download, RefreshCw, BarChart3, FileText, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { toast } from "sonner";
import { membersService, Member as MemberApi } from "../utils/supabase/members-service";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { attendanceService, AttendanceStats } from "../utils/supabase/attendance-service";
import { dashboardService, ClassAttendance as DashboardClassAttendance } from "../utils/supabase/dashboard-service";

interface ReportsAnalyticsProps {
  onNavigate?: (section: string) => void;
}

type MembershipTrendPoint = { month: string; monthKey: string; newMembers: number; cancelledMembers: number; totalMembers: number };
type RevenueBucket = { name: string; value: number; amount: number; color: string };
type PeakHourPoint = { hour: string; usage: number };
type DemographicPoint = { ageGroup: string; count: number; percentage: number };
type RangeKey = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range',
};

function getRangeBounds(rangeKey: RangeKey, customFrom: string, customTo: string) {
  const now = new Date();
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (rangeKey) {
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case '90d':
      start = new Date(end);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom': {
      start = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
      end = customTo ? new Date(`${customTo}T23:59:59.999`) : end;
      break;
    }
    case 'all':
    default:
      start = new Date(2000, 0, 1);
      break;
  }

  const durationMs = Math.max(1, end.getTime() - start.getTime());
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  const hasComparison = rangeKey !== 'all';

  return { start, end, prevStart, prevEnd, hasComparison };
}

function pctChange(current: number, previous: number): number | null {
  if (previous > 0) return ((current - previous) / previous) * 100;
  if (current > 0) return 100;
  return null;
}

type PaymentModeBucket = { name: string; amount: number; value: number; color: string };
type ReportPeriod = { key: string; label: string; start: Date; end: Date; total: number; categories: RevenueBucket[]; methods: PaymentModeBucket[] };

const CATEGORY_COLORS: Record<string, string> = {
  Memberships: "#2B7A78",
  "Personal Training": "#3b82f6",
  "Group Classes": "#f59e0b",
  Merchandise: "#8b5cf6",
  "Other Services": "#64748b",
};

function categorizeReceipt(r: Receipt): string {
  const t = (r.transaction_type || "").toLowerCase();
  const plan = (r.plan_name || "").toLowerCase();
  if (t.includes("renew") || t.includes("upgrade") || t.includes("new member") || plan.includes("membership")) return "Memberships";
  if (t.includes("training") || plan.includes("pt") || plan.includes("personal")) return "Personal Training";
  if (t.includes("class") || plan.includes("class")) return "Group Classes";
  if (t.includes("pos") || t.includes("product") || plan.includes("product")) return "Merchandise";
  return "Other Services";
}

// Immutable receipts split a partially-paid-then-settled bill into multiple
// rows: the original bill row keeps its full invoice amount (r.amount) even
// after later settlements, while each settlement is its own separate row —
// so summing r.amount across all rows double-counts the settled portion.
// r.paid_amount is the actual cash each row received and never overlaps
// between rows, so it's the only field safe to sum for real revenue.
function revenueOf(r: Receipt): number {
  return Number(r.paid_amount) || 0;
}

function buildRevenueBreakdown(rows: Receipt[]): RevenueBucket[] {
  const buckets: Record<string, number> = {};
  const total = rows.reduce((sum, r) => sum + revenueOf(r), 0);

  rows.forEach((r) => {
    const cat = categorizeReceipt(r);
    buckets[cat] = (buckets[cat] || 0) + revenueOf(r);
  });

  return Object.entries(buckets)
    .map(([name, amount]) => ({
      name,
      amount,
      value: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: CATEGORY_COLORS[name] ?? "#64748b",
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Canonical payment-method display names, matching add-member.tsx / check-in.tsx's
// PAYMENT_METHOD_LABELS — those pages already store the human label (e.g. "Cash",
// "Bank Transfer") on the receipt, but older rows or raw keys ("bank-transfer") can
// still show up, so this normalizes either shape to one consistent bucket name.
const CANONICAL_METHOD_NAMES = ["Cash", "Card", "Cheque", "Bank Transfer", "Online Payment", "Credit"];
const PAYMENT_METHOD_KEY_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  check: "Cheque",
  cheque: "Cheque",
  "bank-transfer": "Bank Transfer",
  banktransfer: "Bank Transfer",
  online: "Online Payment",
  credit: "Credit",
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: "#2B7A78",
  Card: "#34d399",
  Cheque: "#3b82f6",
  "Bank Transfer": "#8b5cf6",
  "Online Payment": "#06b6d4",
  Credit: "#f59e0b",
  "Credit Pending": "#f59e0b",
};

function paymentMethodLabel(method?: string): string {
  if (!method) return "Other";
  const trimmed = method.trim();
  const exact = CANONICAL_METHOD_NAMES.find((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const key = trimmed.toLowerCase().replace(/[\s_]/g, "-");
  if (PAYMENT_METHOD_KEY_LABELS[key]) return PAYMENT_METHOD_KEY_LABELS[key];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// A bill's due_amount is the portion still uncollected as of that row — the only
// safe "pending" figure, for the same reason r.amount can't be diffed across the
// split rows an immutable receipt produces (see revenueOf above).
function buildPaymentModeBreakdown(rows: Receipt[]): PaymentModeBucket[] {
  const totals: Record<string, number> = {};

  rows.forEach((r) => {
    const legs = r.payment_breakdown;
    if (legs && legs.length > 0) {
      legs.forEach((leg) => {
        const amt = Number(leg.amount) || 0;
        if (amt <= 0) return;
        const label = paymentMethodLabel(leg.method);
        totals[label] = (totals[label] || 0) + amt;
      });
    } else {
      const paid = revenueOf(r);
      if (paid > 0) {
        const label = paymentMethodLabel(r.payment_method);
        totals[label] = (totals[label] || 0) + paid;
      }
    }

    if (r.invoice_no && r.transaction_type !== "Payment") {
      const due = Number(r.due_amount) || 0;
      if (due > 0) totals["Credit Pending"] = (totals["Credit Pending"] || 0) + due;
    }
  });

  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      value: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: PAYMENT_METHOD_COLORS[name] ?? "#64748b",
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Buckets a date range into weeks (short ranges), months (up to ~2 years), or
// years (longer / "all time"), so the custom revenue report's trend charts and
// tables stay readable no matter which date-range preset is active.
function getPeriodBuckets(start: Date, end: Date): { key: string; label: string; start: Date; end: Date }[] {
  const durationDays = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];

  if (durationDays <= 45) {
    let cursor = new Date(start);
    let idx = 1;
    while (cursor <= end && idx <= 10) {
      const bStart = new Date(cursor);
      const bEnd = new Date(Math.min(end.getTime(), bStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1));
      buckets.push({ key: `w${idx}`, label: `Week ${idx}`, start: bStart, end: bEnd });
      cursor = new Date(bEnd.getTime() + 1);
      idx += 1;
    }
  } else if (durationDays <= 731) {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    let guard = 0;
    while (cursor <= end && guard < 24) {
      const bStart = cursor < start ? start : cursor;
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      const bEnd = monthEnd > end ? end : monthEnd;
      const label = cursor.toLocaleString(undefined, {
        month: "short",
        year: start.getFullYear() !== end.getFullYear() ? "2-digit" : undefined,
      });
      buckets.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, label, start: bStart, end: bEnd });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      guard += 1;
    }
  } else {
    let cursor = new Date(start.getFullYear(), 0, 1);
    let guard = 0;
    while (cursor <= end && guard < 15) {
      const bStart = cursor < start ? start : cursor;
      const yearEnd = new Date(cursor.getFullYear(), 11, 31, 23, 59, 59, 999);
      const bEnd = yearEnd > end ? end : yearEnd;
      buckets.push({ key: `${cursor.getFullYear()}`, label: `${cursor.getFullYear()}`, start: bStart, end: bEnd });
      cursor = new Date(cursor.getFullYear() + 1, 0, 1);
      guard += 1;
    }
  }

  return buckets;
}

export function ReportsAnalytics({ onNavigate }: ReportsAnalyticsProps = {}) {
  const { currencyCode } = useCurrency();
  const statCardShell =
    "bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";
  const panelCardShell = "bg-white border-0 shadow-sm";
  const tabContentShell = "space-y-6 animate-in fade-in-0 zoom-in-95 duration-200";

  const [members, setMembers] = useState<MemberApi[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [classAttendance, setClassAttendance] = useState<DashboardClassAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [reportsTab, setReportsTab] = useState('overview');
  const [activeKpiCard, setActiveKpiCard] = useState<number | null>(null);

  const [reportType, setReportType] = useState<'revenue' | 'membership' | 'attendance' | 'summary'>('summary');
  const [reportFormat, setReportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [reportGenerated, setReportGenerated] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersResp, receiptsResp, att, classAttResp] = await Promise.all([
        membersService.getMembers({}, { page: 1, limit: 2000 }),
        receiptsService.getReceipts({}, { page: 1, limit: 5000 }),
        attendanceService.getAttendanceStats(),
        dashboardService.getClassAttendance().catch(() => ({ success: true, data: [] as any[] })),
      ]);

      setMembers(membersResp.members ?? []);
      setReceipts(receiptsResp.receipts ?? []);
      setAttendanceStats(att);

      const raw = (classAttResp as any)?.data ?? classAttResp;
      setClassAttendance(Array.isArray(raw) ? raw : []);
      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reports data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { start: rangeStart, end: rangeEnd, prevStart, prevEnd, hasComparison } = useMemo(
    () => getRangeBounds(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo]
  );

  const isCancelledStatus = (s: string | undefined) =>
    s === "inactive" || s === "expired" || s === "suspended" || s === "frozen";

  const parseMemberJoinDate = (m: MemberApi) => {
    const raw = m.join_date || m.created_at;
    const dt = raw ? new Date(raw) : null;
    return dt && !Number.isNaN(dt.getTime()) ? dt : null;
  };

  const parseMemberUpdatedDate = (m: MemberApi) => {
    const dt = m.updated_at ? new Date(m.updated_at) : null;
    return dt && !Number.isNaN(dt.getTime()) ? dt : null;
  };

  const parseReceiptDate = (r: Receipt) => {
    const dt = r.transaction_date ? new Date(r.transaction_date) : null;
    return dt && !Number.isNaN(dt.getTime()) ? dt : null;
  };

  // Receipts / new-signups / cancellations scoped to the selected range and its equivalent prior range
  const receiptsInRange = useMemo(() => receipts.filter((r) => {
    const dt = parseReceiptDate(r);
    return dt ? dt >= rangeStart && dt <= rangeEnd : false;
  }), [receipts, rangeStart, rangeEnd]);

  const receiptsInPrevRange = useMemo(() => receipts.filter((r) => {
    const dt = parseReceiptDate(r);
    return dt ? dt >= prevStart && dt <= prevEnd : false;
  }), [receipts, prevStart, prevEnd]);

  // A billed-to-head dependent (minor, or an adult under family_head billing)
  // never generates their own receipt — the whole household is billed to the
  // head — so counting them as full "members" inflates New Members/Churn and
  // dilutes Avg Revenue/Member below. These use only the billing units.
  const householdMembers = useMemo(
    () => members.filter((m) => !((m as any).is_minor || (m as any).billed_to_head)),
    [members]
  );

  const newMembersInRange = useMemo(() => householdMembers.filter((m) => {
    const dt = parseMemberJoinDate(m);
    return dt ? dt >= rangeStart && dt <= rangeEnd : false;
  }), [householdMembers, rangeStart, rangeEnd]);

  const newMembersInPrevRange = useMemo(() => householdMembers.filter((m) => {
    const dt = parseMemberJoinDate(m);
    return dt ? dt >= prevStart && dt <= prevEnd : false;
  }), [householdMembers, prevStart, prevEnd]);

  const cancelledMembersInRange = useMemo(() => householdMembers.filter((m) => {
    if (!isCancelledStatus(m.membership_status)) return false;
    const dt = parseMemberUpdatedDate(m);
    return dt ? dt >= rangeStart && dt <= rangeEnd : false;
  }), [householdMembers, rangeStart, rangeEnd]);

  const cancelledMembersInPrevRange = useMemo(() => householdMembers.filter((m) => {
    if (!isCancelledStatus(m.membership_status)) return false;
    const dt = parseMemberUpdatedDate(m);
    return dt ? dt >= prevStart && dt <= prevEnd : false;
  }), [householdMembers, prevStart, prevEnd]);

  const membershipTrends: MembershipTrendPoint[] = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      months.push({ label, key, start, end });
    }

    return months.map(({ label, key, start, end }) => {
      const newMembers = members.filter((m) => {
        const dt = parseMemberJoinDate(m);
        return dt ? dt >= start && dt <= end : false;
      }).length;

      const cancelledMembers = members.filter((m) => {
        if (!isCancelledStatus(m.membership_status)) return false;
        const dt = parseMemberUpdatedDate(m);
        return dt ? dt >= start && dt <= end : false;
      }).length;

      const totalMembers = members.filter((m) => {
        const dt = parseMemberJoinDate(m);
        return dt ? dt <= end : false;
      }).length;

      return { month: label, monthKey: key, newMembers, cancelledMembers, totalMembers };
    });
  }, [members]);

  const revenueBreakdown = useMemo(() => buildRevenueBreakdown(receiptsInRange), [receiptsInRange]);
  const revenueBreakdownPrev = useMemo(() => buildRevenueBreakdown(receiptsInPrevRange), [receiptsInPrevRange]);

  const paymentBreakdown = useMemo(() => buildPaymentModeBreakdown(receiptsInRange), [receiptsInRange]);
  const paymentBreakdownPrev = useMemo(() => buildPaymentModeBreakdown(receiptsInPrevRange), [receiptsInPrevRange]);

  const reportPeriods: ReportPeriod[] = useMemo(() => {
    const buckets = getPeriodBuckets(rangeStart, rangeEnd);
    return buckets.map((b) => {
      const rows = receiptsInRange.filter((r) => {
        const dt = parseReceiptDate(r);
        return dt ? dt >= b.start && dt <= b.end : false;
      });
      return {
        ...b,
        total: rows.reduce((sum, r) => sum + revenueOf(r), 0),
        categories: buildRevenueBreakdown(rows),
        methods: buildPaymentModeBreakdown(rows),
      };
    });
  }, [receiptsInRange, rangeStart, rangeEnd]);

  const totalRevenuePeriod = useMemo(() => receiptsInRange.reduce((sum, r) => sum + revenueOf(r), 0), [receiptsInRange]);
  const prevTotalRevenue = useMemo(() => receiptsInPrevRange.reduce((sum, r) => sum + revenueOf(r), 0), [receiptsInPrevRange]);
  const avgPerTransaction = receiptsInRange.length > 0 ? totalRevenuePeriod / receiptsInRange.length : 0;
  const prevAvgPerTransaction = receiptsInPrevRange.length > 0 ? prevTotalRevenue / receiptsInPrevRange.length : 0;
  const membershipRevenue = revenueBreakdown.find((b) => b.name === "Memberships")?.amount ?? 0;
  const prevMembershipRevenue = revenueBreakdownPrev.find((b) => b.name === "Memberships")?.amount ?? 0;
  const trainingRevenue = revenueBreakdown.find((b) => b.name === "Personal Training")?.amount ?? 0;
  const prevTrainingRevenue = revenueBreakdownPrev.find((b) => b.name === "Personal Training")?.amount ?? 0;

  const revenueReportKpis = [
    {
      title: "Total Revenue",
      value: `${currencyCode} ${Math.round(totalRevenuePeriod).toLocaleString()}`,
      change: hasComparison ? pctChange(totalRevenuePeriod, prevTotalRevenue) : null,
      icon: DollarSign,
      iconShell: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Avg Per Transaction",
      value: `${currencyCode} ${Math.round(avgPerTransaction).toLocaleString()}`,
      change: hasComparison ? pctChange(avgPerTransaction, prevAvgPerTransaction) : null,
      icon: TrendingUp,
      iconShell: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Membership Revenue",
      value: `${currencyCode} ${Math.round(membershipRevenue).toLocaleString()}`,
      change: hasComparison ? pctChange(membershipRevenue, prevMembershipRevenue) : null,
      icon: Users,
      iconShell: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Training Revenue",
      value: `${currencyCode} ${Math.round(trainingRevenue).toLocaleString()}`,
      change: hasComparison ? pctChange(trainingRevenue, prevTrainingRevenue) : null,
      icon: Activity,
      iconShell: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  const revenueTrendRows = useMemo(() => reportPeriods.map((p) => ({ period: p.label, revenue: p.total })), [reportPeriods]);

  const paymentTrendRows = useMemo(
    () =>
      reportPeriods.map((p) => {
        const row: Record<string, string | number> = { period: p.label };
        paymentBreakdown.forEach((m) => {
          row[m.name] = p.methods.find((x) => x.name === m.name)?.amount || 0;
        });
        return row;
      }),
    [reportPeriods, paymentBreakdown]
  );

  const revenueTrend = useMemo(() => {
    const sums: Record<string, number> = {};
    receipts.forEach((r) => {
      const dt = parseReceiptDate(r);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      sums[key] = (sums[key] || 0) + revenueOf(r);
    });
    return membershipTrends.map((m) => ({
      month: m.month,
      revenue: Math.round(sums[m.monthKey] || 0),
    }));
  }, [receipts, membershipTrends]);

  const topPlans = useMemo(() => {
    const buckets: Record<string, { plan: string; revenue: number; count: number }> = {};
    receiptsInRange.forEach((r) => {
      const plan = r.plan_name || r.transaction_type || "Unspecified";
      if (!buckets[plan]) buckets[plan] = { plan, revenue: 0, count: 0 };
      buckets[plan].revenue += revenueOf(r);
      buckets[plan].count += 1;
    });
    return Object.values(buckets).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [receiptsInRange]);

  const membershipEvents = useMemo(() => {
    const joined = newMembersInRange.map((m) => ({
      name: m.name,
      type: 'Joined' as const,
      date: parseMemberJoinDate(m),
      detail: m.membership_type || m.membership_plan || '—',
    }));
    const cancelled = cancelledMembersInRange.map((m) => ({
      name: m.name,
      type: 'Cancelled' as const,
      date: parseMemberUpdatedDate(m),
      detail: m.membership_status,
    }));
    return [...joined, ...cancelled]
      .filter((e) => e.date)
      .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
      .slice(0, 12);
  }, [newMembersInRange, cancelledMembersInRange]);

  const peakHours: PeakHourPoint[] = useMemo(() => {
    const peak = attendanceStats?.peakHours ?? {};
    const entries = Object.entries(peak);
    const sorted = entries.sort((a, b) => {
      const ah = Number.parseInt(a[0], 10);
      const bh = Number.parseInt(b[0], 10);
      return (Number.isNaN(ah) ? 0 : ah) - (Number.isNaN(bh) ? 0 : bh);
    });
    return sorted.map(([hour, usage]) => ({ hour, usage }));
  }, [attendanceStats]);

  const memberDemographics: DemographicPoint[] = useMemo(() => {
    const ages: number[] = [];
    const now = new Date();
    members.forEach((m) => {
      const dob = (m as any).date_of_birth;
      if (!dob) return;
      const dt = new Date(dob);
      if (Number.isNaN(dt.getTime())) return;
      const age = Math.floor((now.getTime() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 100) ages.push(age);
    });
    if (ages.length === 0) return [];
    const groups = [
      { label: "18-25", min: 18, max: 25 },
      { label: "26-35", min: 26, max: 35 },
      { label: "36-45", min: 36, max: 45 },
      { label: "46-55", min: 46, max: 55 },
      { label: "55+", min: 56, max: 120 },
    ];
    return groups.map((g) => {
      const count = ages.filter((a) => a >= g.min && a <= g.max).length;
      const percentage = Math.round((count / ages.length) * 100);
      return { ageGroup: g.label, count, percentage };
    });
  }, [members]);

  const kpiData = useMemo(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.membership_status === "active").length;
    const retention = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

    const activeHouseholdMembers = householdMembers.filter((m) => m.membership_status === "active").length;
    const periodRevenue = receiptsInRange.reduce((sum, r) => sum + revenueOf(r), 0);
    const prevPeriodRevenue = receiptsInPrevRange.reduce((sum, r) => sum + revenueOf(r), 0);
    const arpm = activeHouseholdMembers > 0 ? periodRevenue / activeHouseholdMembers : 0;
    const prevArpm = activeHouseholdMembers > 0 ? prevPeriodRevenue / activeHouseholdMembers : 0;
    const arpmChange = hasComparison ? pctChange(arpm, prevArpm) : null;

    const newMembersChange = hasComparison ? pctChange(newMembersInRange.length, newMembersInPrevRange.length) : null;

    const classUtil = classAttendance.length > 0
      ? classAttendance.reduce((s, x) => s + (x.percentage || 0), 0) / classAttendance.length
      : 0;

    const todayAttendance = attendanceStats?.totalToday ?? 0;
    const weeklyDailyAvg = (attendanceStats?.totalThisWeek ?? 0) / 7;
    const todayVsAvg = weeklyDailyAvg > 0 ? pctChange(todayAttendance, weeklyDailyAvg) : null;

    return [
      {
        title: "Member Retention",
        value: `${retention.toFixed(1)}%`,
        change: null as number | null,
        description: `${activeMembers.toLocaleString()} active of ${totalMembers.toLocaleString()} members`,
        icon: Users,
        iconShell: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
        tab: "membership",
      },
      {
        title: "Avg Revenue / Member",
        value: `${currencyCode} ${Math.round(arpm).toLocaleString()}`,
        change: arpmChange,
        description: `vs previous period`,
        icon: DollarSign,
        iconShell: "bg-blue-50",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
        tab: "revenue",
      },
      {
        title: "New Members",
        value: newMembersInRange.length.toLocaleString(),
        change: newMembersChange,
        description: `vs previous period`,
        icon: TrendingUp,
        iconShell: "bg-indigo-50",
        iconColor: "text-indigo-600",
        valueColor: "text-indigo-700",
        tab: "membership",
      },
      {
        title: "Class Utilization",
        value: `${classUtil.toFixed(0)}%`,
        change: null as number | null,
        description: "Avg across classes",
        icon: Activity,
        iconShell: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
        tab: "operations",
      },
      {
        title: "Today's Attendance",
        value: todayAttendance.toLocaleString(),
        change: todayVsAvg,
        description: `vs 7-day daily avg`,
        icon: BarChart3,
        iconShell: "bg-slate-50",
        tab: "operations",
        iconColor: "text-slate-600",
        valueColor: "text-slate-700",
      },
    ];
  }, [members, householdMembers, receiptsInRange, receiptsInPrevRange, newMembersInRange, newMembersInPrevRange, classAttendance, attendanceStats, currencyCode, hasComparison]);

  const membershipMetrics = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.membership_status === "active").length;
    const retention = total > 0 ? (active / total) * 100 : 0;

    const avgVisitMinutes = attendanceStats?.averageDuration ?? 0;

    const lengths: number[] = [];
    members.forEach((m) => {
      const startRaw = (m as any).membership_start_date || m.join_date || m.created_at;
      const endRaw = (m as any).membership_end_date || m.expiry_date;
      if (!startRaw || !endRaw) return;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const months = Math.max(0, (end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
      if (months > 0 && months < 240) lengths.push(months);
    });
    const avgMembershipMonths = lengths.length > 0
      ? lengths.reduce((s, x) => s + x, 0) / lengths.length
      : 0;

    return {
      total,
      active,
      retention,
      avgVisitMinutes,
      avgMembershipMonths,
    };
  }, [members, attendanceStats]);

  type ReportKpi = {
    title: string;
    value: string;
    change: number | null;
    icon: React.ComponentType<{ className?: string }>;
    iconShell: string;
    iconColor: string;
    invert?: boolean;
    description?: string;
  };

  const renderKpiRow = (kpis: ReportKpi[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className={statCardShell}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">{kpi.title}</CardTitle>
            <div className={`${kpi.iconShell} p-2 rounded-lg`}>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {kpi.change !== null && (
                <>
                  {getTrendIcon(kpi.change, kpi.invert)}
                  <span className={getTrendColor(kpi.change, kpi.invert)}>{Math.abs(kpi.change).toFixed(1)}%</span>
                </>
              )}
              {kpi.description && <span>{kpi.description}</span>}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const membershipReportKpis: ReportKpi[] = [
    {
      title: "Total Members",
      value: membershipMetrics.total.toLocaleString(),
      change: null,
      icon: Users,
      iconShell: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Active Members",
      value: membershipMetrics.active.toLocaleString(),
      change: null,
      icon: Activity,
      iconShell: "bg-blue-50",
      iconColor: "text-blue-600",
      description: `${membershipMetrics.retention.toFixed(1)}% retention rate`,
    },
    {
      title: "New Members",
      value: newMembersInRange.length.toLocaleString(),
      change: hasComparison ? pctChange(newMembersInRange.length, newMembersInPrevRange.length) : null,
      icon: TrendingUp,
      iconShell: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      title: "Cancellations",
      value: cancelledMembersInRange.length.toLocaleString(),
      change: hasComparison ? pctChange(cancelledMembersInRange.length, cancelledMembersInPrevRange.length) : null,
      invert: true,
      icon: ArrowDownRight,
      iconShell: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  const attendanceReportKpis: ReportKpi[] = [
    {
      title: "Classes Tracked",
      value: classAttendance.length.toLocaleString(),
      change: null,
      icon: BarChart3,
      iconShell: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Avg Class Utilization",
      value: `${(classAttendance.length > 0 ? classAttendance.reduce((s, c) => s + (c.percentage || 0), 0) / classAttendance.length : 0).toFixed(0)}%`,
      change: null,
      icon: Activity,
      iconShell: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Today's Attendance",
      value: (attendanceStats?.totalToday ?? 0).toLocaleString(),
      change: (attendanceStats?.totalThisWeek ?? 0) / 7 > 0
        ? pctChange(attendanceStats?.totalToday ?? 0, (attendanceStats?.totalThisWeek ?? 0) / 7)
        : null,
      icon: TrendingUp,
      iconShell: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Avg Visit Duration",
      value: membershipMetrics.avgVisitMinutes ? `${membershipMetrics.avgVisitMinutes} min` : "—",
      change: null,
      icon: Users,
      iconShell: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  const rangeLabel = useMemo(() => {
    if (rangeKey === 'custom') {
      return `${customFrom || rangeStart.toISOString().split('T')[0]}_to_${customTo || rangeEnd.toISOString().split('T')[0]}`;
    }
    return RANGE_LABELS[rangeKey].toLowerCase().replaceAll(' ', '_');
  }, [rangeKey, customFrom, customTo, rangeStart, rangeEnd]);

  // Export helpers
  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toCsvCell = (value: unknown) => {
    const s = value == null ? "" : String(value);
    return `"${s.replaceAll('"', '""')}"`;
  };

  const buildCsv = (header: string[], rows: (string | number)[][]) =>
    [header.map(toCsvCell).join(","), ...rows.map((row) => row.map(toCsvCell).join(","))].join("\n");

  const buildRevenueCsv = () => buildCsv(
    ["Category", `Amount (${currencyCode})`, "Share %"],
    revenueBreakdown.map((b) => [b.name, Math.round(b.amount), b.value]),
  );

  const buildMembershipCsv = () => buildCsv(
    ["Event", "Member", "Date", "Detail"],
    membershipEvents.map((e) => [e.type, e.name, (e.date as Date).toISOString().split('T')[0], e.detail || '']),
  );

  const buildAttendanceCsv = () => buildCsv(
    ["Class", "Utilization %"],
    classAttendance.map((c: any) => [c.class ?? c.name ?? 'Unknown', c.percentage ?? 0]),
  );

  const buildSummaryCsv = () => buildCsv(
    ["Metric", "Value"],
    [
      ["Range", RANGE_LABELS[rangeKey]],
      ...kpiData.map((k) => [k.title, k.value]),
      ["Top Plan", topPlans[0]?.plan ?? "—"],
      ["Total Receipts In Range", receiptsInRange.length],
      ["New Members In Range", newMembersInRange.length],
      ["Cancelled Members In Range", cancelledMembersInRange.length],
    ],
  );

  const csvBuilders: Record<typeof reportType, () => string> = {
    revenue: buildRevenueCsv,
    membership: buildMembershipCsv,
    attendance: buildAttendanceCsv,
    summary: buildSummaryCsv,
  };

  const runExport = useCallback((type: typeof reportType, format: typeof reportFormat) => {
    const csv = csvBuilders[type]();
    const filenameBase = `reports_${type}_${rangeLabel}`;

    if (format === 'csv') {
      downloadBlob(`${filenameBase}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
      toast.success("CSV downloaded");
      return;
    }

    if (format === 'excel') {
      const lines = csv.split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, '').replaceAll('""', '"')));
      const html = `<html><head><meta charset="utf-8" /></head><body><table border="1" cellspacing="0" cellpadding="4">${lines
        .map((cells, i) => `<tr>${cells.map((c) => `<${i === 0 ? 'th' : 'td'}>${c}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`)
        .join('')}</table></body></html>`;
      downloadBlob(`${filenameBase}.xls`, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
      toast.success("Excel downloaded");
      return;
    }

    // pdf: print-friendly popup
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked. Please allow popups to export PDF.");
      return;
    }
    const lines = csv.split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, '').replaceAll('""', '"')));
    w.document.write(`
      <html><head><meta charset="utf-8" /><title>Report</title>
      <style>body{font-family:ui-sans-serif,system-ui;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f9fafb}</style>
      </head><body>
      <h1 style="margin:0 0 6px;font-size:18px;">${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
      <div style="color:#6b7280;font-size:12px;margin-bottom:16px;">Range: ${RANGE_LABELS[rangeKey]}</div>
      <table>${lines.map((cells, i) => `<tr>${cells.map((c) => `<${i === 0 ? 'th' : 'td'}>${c}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>
      <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
    toast.success("Print dialog opened (Save as PDF)");
  }, [csvBuilders, rangeKey, rangeLabel]);

  const handleExportReport = useCallback(() => {
    runExport('summary', 'csv');
  }, [runExport]);

  const handleGenerateReport = useCallback(() => {
    setReportGenerated(true);
  }, []);

  const handleScheduleReportClick = useCallback(() => {
    toast.info("Report scheduling isn't available yet.", {
      description: "You can generate and download reports on demand for now.",
    });
  }, []);

  const downloadRevenueReportPdf = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked. Please allow popups to export PDF.");
      return;
    }
    const money = (n: number) => `${currencyCode} ${Math.round(n).toLocaleString()}`;

    const kpiRows = revenueReportKpis.map((k) => [k.title, k.value]);

    const paymentTableRows = paymentBreakdown
      .map((m) => `<tr><td>${m.name}</td><td>${money(m.amount)}</td><td>${m.value}%</td></tr>`)
      .join("");

    const periodTableHeader = [...paymentBreakdown.map((m) => m.name), "Total"];
    const periodTableRows = reportPeriods
      .map((p) => {
        const cells = paymentBreakdown
          .map((m) => `<td>${money(p.methods.find((x) => x.name === m.name)?.amount || 0)}</td>`)
          .join("");
        return `<tr><td>${p.label}</td>${cells}<td><strong>${money(p.total)}</strong></td></tr>`;
      })
      .join("");

    const categoryTableRows = revenueBreakdown
      .map((c) => `<tr><td>${c.name}</td><td>${money(c.amount)}</td><td>${c.value}%</td></tr>`)
      .join("");

    const detailedTableHeader = [...revenueBreakdown.map((c) => c.name), "Total"];
    const detailedTableRows = reportPeriods
      .map((p) => {
        const cells = revenueBreakdown
          .map((c) => `<td>${money(p.categories.find((x) => x.name === c.name)?.amount || 0)}</td>`)
          .join("");
        return `<tr><td>${p.label}</td>${cells}<td><strong>${money(p.total)}</strong></td></tr>`;
      })
      .join("");

    w.document.write(`
      <html><head><meta charset="utf-8" /><title>Revenue Analysis Report</title>
      <style>
        body{font-family:ui-sans-serif,system-ui;padding:24px;color:#1f2937}
        h1{margin:0 0 4px;font-size:20px}
        h2{margin:24px 0 8px;font-size:15px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
        th{background:#f9fafb}
        .meta{color:#6b7280;font-size:12px;margin-bottom:16px}
      </style>
      </head><body>
      <h1>Revenue Analysis Report</h1>
      <div class="meta">Range: ${RANGE_LABELS[rangeKey]}</div>
      <h2>Summary</h2>
      <table>${kpiRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
      <h2>Payment Mode Performance</h2>
      <table><tr><th>Method</th><th>Amount</th><th>Share</th></tr>${paymentTableRows}</table>
      <h2>Period-wise Payment Mode Breakdown</h2>
      <table><tr><th>Period</th>${periodTableHeader.map((h) => `<th>${h}</th>`).join("")}</tr>${periodTableRows}</table>
      <h2>Revenue by Category</h2>
      <table><tr><th>Category</th><th>Amount</th><th>Share</th></tr>${categoryTableRows}</table>
      <h2>Detailed Revenue Breakdown</h2>
      <table><tr><th>Period</th>${detailedTableHeader.map((h) => `<th>${h}</th>`).join("")}</tr>${detailedTableRows}</table>
      <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
    toast.success("Print dialog opened (Save as PDF)");
  }, [currencyCode, revenueReportKpis, paymentBreakdown, reportPeriods, revenueBreakdown, rangeKey]);

  // `invert` flags metrics where a rise is bad news (e.g. cancellations) so the
  // up/down arrow still colors green-for-good instead of green-for-increase.
  const getTrendIcon = (change: number | null, invert = false) => {
    if (change === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    const isGood = invert ? change <= 0 : change >= 0;
    return change >= 0
      ? <ArrowUpRight className={`h-3.5 w-3.5 ${isGood ? "text-green-600" : "text-red-600"}`} />
      : <ArrowDownRight className={`h-3.5 w-3.5 ${isGood ? "text-green-600" : "text-red-600"}`} />;
  };

  const getTrendColor = (change: number | null, invert = false) => {
    if (change === null) return "text-muted-foreground";
    const isGood = invert ? change <= 0 : change >= 0;
    return isGood ? "text-green-600" : "text-red-600";
  };

  if (loading && members.length === 0 && receipts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive business intelligence and performance metrics.</p>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-1">Last refreshed {lastRefreshed.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {rangeKey === 'custom' && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px] bg-white" />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px] bg-white" />
            </>
          )}
          <Button
            size="sm"
            className="btn-primary shadow-sm hover:shadow-md transition-all"
            onClick={() => onNavigate?.('custom-reports')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Custom Reports
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiData.map((kpi, index) => (
          <Card
            key={index}
            className={`${statCardShell} cursor-pointer`}
            style={activeKpiCard === index ? { boxShadow: '0 0 0 2px #2B7A78' } : undefined}
            title={`Click to view ${kpi.tab} report`}
            onClick={() => { setReportsTab(kpi.tab); setActiveKpiCard(index); }}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">{kpi.title}</CardTitle>
              <div className={`${kpi.iconShell} p-2 rounded-lg`}>
                <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.valueColor}`}>{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {kpi.change !== undefined && kpi.change !== null && (
                  <>
                    {getTrendIcon(kpi.change)}
                    <span className={getTrendColor(kpi.change)}>{Math.abs(kpi.change).toFixed(1)}%</span>
                  </>
                )}
                <span>{kpi.description}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={reportsTab} onValueChange={(v) => { setReportsTab(v); setActiveKpiCard(null); }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Membership Growth Trend</CardTitle>
                <CardDescription>Member acquisition and retention over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalMembers" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Revenue breakdown by service type ({RANGE_LABELS[rangeKey]})</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueBreakdown.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No receipts in this range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
              <CardDescription>Gym utilization throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              {peakHours.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No attendance data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#2B7A78" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Member Acquisition vs Churn</CardTitle>
                <CardDescription>Monthly new members vs cancellations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newMembers" fill="#82ca9d" name="New Members" />
                    <Bar dataKey="cancelledMembers" fill="#ff7c7c" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Member Demographics</CardTitle>
                <CardDescription>Age distribution of members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberDemographics.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    Add member date-of-birth to see demographics.
                  </div>
                ) : (
                  memberDemographics.map((demo, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{demo.ageGroup}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${demo.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{demo.count}</span>
                        <Badge variant="secondary">{demo.percentage}%</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Membership Metrics</CardTitle>
              <CardDescription>Key membership performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{membershipMetrics.retention.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Retention Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{membershipMetrics.active.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Active Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {membershipMetrics.avgMembershipMonths > 0 ? `${membershipMetrics.avgMembershipMonths.toFixed(1)} mo` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg. Membership Length</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Recent Signups & Cancellations</CardTitle>
              <CardDescription>Member events within {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {membershipEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No member events in this range.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membershipEvents.map((e, i) => (
                      <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>
                          <Badge className={e.type === 'Joined' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {e.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{(e.date as Date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-muted-foreground">{e.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#2B7A78" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>{RANGE_LABELS[rangeKey]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueBreakdown.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No receipts found in this range.
                  </div>
                ) : (
                  revenueBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <div className="text-right">
                        <div className="font-medium"><CurrencyGlyph /> {Math.round(item.amount).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{item.value}%</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Top Performing Plans</CardTitle>
              <CardDescription>Highest revenue plans/transaction types within {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {topPlans.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No transactions in this range.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Plan / Transaction Type</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg / Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPlans.map((p, i) => (
                      <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                        <TableCell className="font-medium">{p.plan}</TableCell>
                        <TableCell>{p.count}</TableCell>
                        <TableCell className="text-green-600 font-medium"><CurrencyGlyph /> {Math.round(p.revenue).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground"><CurrencyGlyph /> {Math.round(p.revenue / p.count).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Class Attendance</CardTitle>
                <CardDescription>Latest attendance distribution by class</CardDescription>
              </CardHeader>
              <CardContent>
                {classAttendance.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No class attendance data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#2B7A78" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
                <CardDescription>Live stats from attendance and receipts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Today Attendance</span>
                    <span className="text-sm font-medium">{attendanceStats?.totalToday ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${membershipMetrics.total > 0 ? Math.min(100, ((attendanceStats?.totalToday ?? 0) / membershipMetrics.total) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Avg Visit Duration</span>
                    <span className="text-sm font-medium">{membershipMetrics.avgVisitMinutes ? `${membershipMetrics.avgVisitMinutes} min` : "—"}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (membershipMetrics.avgVisitMinutes / 120) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Receipts In Range</span>
                    <span className="text-sm font-medium">{receiptsInRange.length.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${receipts.length > 0 ? Math.min(100, (receiptsInRange.length / receipts.length) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className={tabContentShell}>
          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create custom reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={rangeKey} onValueChange={(v) => { setRangeKey(v as RangeKey); setReportGenerated(false); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="ytd">Year to date</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                  {rangeKey === 'custom' && (
                    <div className="flex gap-2 pt-1">
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-white" />
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={reportType} onValueChange={(v) => { setReportType(v as typeof reportType); setReportGenerated(false); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Full Summary</SelectItem>
                      <SelectItem value="revenue">Revenue Analysis</SelectItem>
                      <SelectItem value="membership">Membership Report</SelectItem>
                      <SelectItem value="attendance">Class Attendance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as typeof reportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV Data</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button className="shadow-sm hover:shadow-md transition-all" onClick={handleGenerateReport}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={handleScheduleReportClick}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Report
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{receiptsInRange.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Receipts in range</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{newMembersInRange.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">New members</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{cancelledMembersInRange.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Cancellations</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{classAttendance.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Classes tracked</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportGenerated && (
            <div className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
              {reportType === 'revenue' && (
                <>
              {renderKpiRow(revenueReportKpis)}

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Revenue Trend Analysis</CardTitle>
                  <CardDescription>Revenue breakdown over {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueTrendRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => [`${currencyCode} ${Math.round(v).toLocaleString()}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Payment Mode Performance</CardTitle>
                  <CardDescription>Revenue collection breakdown by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentBreakdown.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      No payments recorded in this range.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={paymentBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={90}
                            dataKey="amount"
                          >
                            {paymentBreakdown.map((entry, index) => (
                              <Cell key={`pm-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${currencyCode} ${Math.round(v).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-4">
                        {paymentBreakdown.map((m, i) => {
                          const prevAmount = paymentBreakdownPrev.find((p) => p.name === m.name)?.amount ?? 0;
                          const change = hasComparison ? pctChange(m.amount, prevAmount) : null;
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{m.name}</span>
                                <div className="text-right">
                                  <span className="font-medium"><CurrencyGlyph /> {Math.round(m.amount).toLocaleString()}</span>
                                  {change !== null && (
                                    <span className={`ml-2 text-xs ${getTrendColor(change)}`}>
                                      {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{m.value}% of total revenue</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Payment Mode Trends Over Time</CardTitle>
                  <CardDescription>How each payment method trended across {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={paymentTrendRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => `${currencyCode} ${Math.round(v).toLocaleString()}`} />
                      {paymentBreakdown.map((m) => (
                        <Line key={m.name} type="monotone" dataKey={m.name} stroke={m.color} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Period-wise Payment Mode Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Period</TableHead>
                        {paymentBreakdown.map((m) => (
                          <TableHead key={m.name}>{m.name}</TableHead>
                        ))}
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportPeriods.map((p, i) => (
                        <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                          <TableCell className="font-medium">{p.label}</TableCell>
                          {paymentBreakdown.map((m) => (
                            <TableCell key={m.name}>
                              <CurrencyGlyph /> {Math.round(p.methods.find((x) => x.name === m.name)?.amount || 0).toLocaleString()}
                            </TableCell>
                          ))}
                          <TableCell className="font-semibold text-primary">
                            <CurrencyGlyph /> {Math.round(p.total).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/70 font-semibold">
                        <TableCell>Total</TableCell>
                        {paymentBreakdown.map((m) => (
                          <TableCell key={m.name}><CurrencyGlyph /> {Math.round(m.amount).toLocaleString()}</TableCell>
                        ))}
                        <TableCell className="text-primary"><CurrencyGlyph /> {Math.round(totalRevenuePeriod).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={panelCardShell}>
                  <CardHeader>
                    <CardTitle>Revenue by Category</CardTitle>
                    <CardDescription>Percentage breakdown of revenue sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueBreakdown.length === 0 ? (
                      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                        No receipts in this range.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={90}
                            dataKey="value"
                          >
                            {revenueBreakdown.map((entry, index) => (
                              <Cell key={`cat-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(_v: number, _n: string, p: any) => `${currencyCode} ${Math.round(p.payload.amount).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className={panelCardShell}>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Detailed revenue breakdown by source</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {revenueBreakdown.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-8 text-center">No receipts in this range.</div>
                    ) : (
                      revenueBreakdown.map((c, i) => {
                        const prevAmount = revenueBreakdownPrev.find((p) => p.name === c.name)?.amount ?? 0;
                        const change = hasComparison ? pctChange(c.amount, prevAmount) : null;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{c.name}</span>
                              <div className="text-right">
                                <span className="font-medium"><CurrencyGlyph /> {Math.round(c.amount).toLocaleString()}</span>
                                {change !== null && (
                                  <span className={`ml-2 text-xs ${getTrendColor(change)}`}>
                                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${c.value}%`, backgroundColor: c.color }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Detailed Revenue Breakdown</CardTitle>
                  <CardDescription>Period-by-period revenue analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Period</TableHead>
                        {revenueBreakdown.map((c) => (
                          <TableHead key={c.name}>{c.name}</TableHead>
                        ))}
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportPeriods.map((p, i) => (
                        <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                          <TableCell className="font-medium">{p.label}</TableCell>
                          {revenueBreakdown.map((c) => (
                            <TableCell key={c.name}>
                              <CurrencyGlyph /> {Math.round(p.categories.find((x) => x.name === c.name)?.amount || 0).toLocaleString()}
                            </TableCell>
                          ))}
                          <TableCell className="font-semibold text-primary">
                            <CurrencyGlyph /> {Math.round(p.total).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/70 font-semibold">
                        <TableCell>Total</TableCell>
                        {revenueBreakdown.map((c) => (
                          <TableCell key={c.name}><CurrencyGlyph /> {Math.round(c.amount).toLocaleString()}</TableCell>
                        ))}
                        <TableCell className="text-primary"><CurrencyGlyph /> {Math.round(totalRevenuePeriod).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

                </>
              )}

              {reportType === 'membership' && (
                <>
                  {renderKpiRow(membershipReportKpis)}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Member Acquisition vs Churn</CardTitle>
                        <CardDescription>Monthly new members vs cancellations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={membershipTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="newMembers" fill="#82ca9d" name="New Members" />
                            <Bar dataKey="cancelledMembers" fill="#ff7c7c" name="Cancelled" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Member Demographics</CardTitle>
                        <CardDescription>Age distribution of members</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {memberDemographics.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-8 text-center">
                            Add member date-of-birth to see demographics.
                          </div>
                        ) : (
                          memberDemographics.map((demo, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium">{demo.ageGroup}</span>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${demo.percentage}%` }}></div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">{demo.count}</span>
                                <Badge variant="secondary">{demo.percentage}%</Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={panelCardShell}>
                    <CardHeader>
                      <CardTitle>Recent Signups & Cancellations</CardTitle>
                      <CardDescription>Member events within {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {membershipEvents.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          No member events in this range.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead>Member</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Detail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {membershipEvents.map((e, i) => (
                              <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                                <TableCell className="font-medium">{e.name}</TableCell>
                                <TableCell>
                                  <Badge className={e.type === 'Joined' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {e.type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{(e.date as Date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-muted-foreground">{e.detail}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {reportType === 'attendance' && (
                <>
                  {renderKpiRow(attendanceReportKpis)}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Class Attendance</CardTitle>
                        <CardDescription>Latest attendance distribution by class</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {classAttendance.length === 0 ? (
                          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                            No class attendance data available yet.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={classAttendance}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="class" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="percentage" fill="#2B7A78" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Peak Usage Hours</CardTitle>
                        <CardDescription>Gym utilization throughout the day</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {peakHours.length === 0 ? (
                          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                            No attendance data available yet.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={peakHours}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="usage" fill="#f59e0b" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={panelCardShell}>
                    <CardHeader>
                      <CardTitle>Class Attendance Detail</CardTitle>
                      <CardDescription>Capacity vs actual attendance by class</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {classAttendance.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          No class attendance data available yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead>Class</TableHead>
                              <TableHead>Capacity</TableHead>
                              <TableHead>Attended</TableHead>
                              <TableHead>Utilization</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classAttendance.map((c: any, i: number) => (
                              <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                                <TableCell className="font-medium">{c.class}</TableCell>
                                <TableCell>{c.capacity}</TableCell>
                                <TableCell>{c.attended}</TableCell>
                                <TableCell>
                                  <Badge className={c.percentage >= 75 ? 'bg-green-100 text-green-800' : c.percentage >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                                    {c.percentage}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {reportType === 'summary' && (
                <>
                  {renderKpiRow(kpiData)}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Revenue over {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={revenueTrendRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip formatter={(v: number) => [`${currencyCode} ${Math.round(v).toLocaleString()}`, 'Revenue']} />
                            <Area type="monotone" dataKey="revenue" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.15} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className={panelCardShell}>
                      <CardHeader>
                        <CardTitle>Membership Growth</CardTitle>
                        <CardDescription>Total members over the last 6 months</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={membershipTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="totalMembers" stroke="#8884d8" fill="#8884d8" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={panelCardShell}>
                    <CardHeader>
                      <CardTitle>Top Performing Plans</CardTitle>
                      <CardDescription>Highest revenue plans/transaction types within {RANGE_LABELS[rangeKey].toLowerCase()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topPlans.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          No transactions in this range.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead>Plan / Transaction Type</TableHead>
                              <TableHead>Transactions</TableHead>
                              <TableHead>Revenue</TableHead>
                              <TableHead>Avg / Transaction</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topPlans.map((p, i) => (
                              <TableRow key={i} className="transition-colors hover:bg-slate-50/50">
                                <TableCell className="font-medium">{p.plan}</TableCell>
                                <TableCell>{p.count}</TableCell>
                                <TableCell className="text-green-600 font-medium"><CurrencyGlyph /> {Math.round(p.revenue).toLocaleString()}</TableCell>
                                <TableCell className="text-muted-foreground"><CurrencyGlyph /> {Math.round(p.revenue / p.count).toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="shadow-sm hover:shadow-md transition-all"
                  onClick={reportType === 'revenue' ? downloadRevenueReportPdf : () => runExport(reportType, reportFormat)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {reportType === 'revenue' ? 'Download PDF Report' : 'Download Report'}
                </Button>
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => setReportGenerated(false)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate New Report
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
