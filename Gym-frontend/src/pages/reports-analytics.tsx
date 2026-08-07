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

  const [reportType, setReportType] = useState<'revenue' | 'membership' | 'attendance' | 'summary'>('summary');
  const [reportFormat, setReportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');

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

  // Immutable receipts split a partially-paid-then-settled bill into multiple
  // rows: the original bill row keeps its full invoice amount (r.amount) even
  // after later settlements, while each settlement is its own separate row —
  // so summing r.amount across all rows double-counts the settled portion.
  // r.paid_amount is the actual cash each row received and never overlaps
  // between rows, so it's the only field safe to sum for real revenue.
  const revenueOf = (r: Receipt): number => Number(r.paid_amount) || 0;

  const buildRevenueBreakdown = useCallback((rows: Receipt[]): RevenueBucket[] => {
    const buckets: Record<string, number> = {};
    const total = rows.reduce((sum, r) => sum + revenueOf(r), 0);

    const normalizeCategory = (r: Receipt) => {
      const t = (r.transaction_type || "").toLowerCase();
      const plan = (r.plan_name || "").toLowerCase();
      if (t.includes("renew") || t.includes("upgrade") || t.includes("new member") || plan.includes("membership")) return "Memberships";
      if (t.includes("training") || plan.includes("pt") || plan.includes("personal")) return "Personal Training";
      if (t.includes("class") || plan.includes("class")) return "Group Classes";
      if (t.includes("pos") || t.includes("product") || plan.includes("product")) return "Merchandise";
      if (t.includes("add-on") || t.includes("addon") || plan.includes("add")) return "Other Services";
      return "Other Services";
    };

    rows.forEach((r) => {
      const cat = normalizeCategory(r);
      buckets[cat] = (buckets[cat] || 0) + revenueOf(r);
    });

    const colors: Record<string, string> = {
      Memberships: "#2B7A78",
      "Personal Training": "#3b82f6",
      "Group Classes": "#f59e0b",
      Merchandise: "#8b5cf6",
      "Other Services": "#64748b",
    };

    return Object.entries(buckets)
      .map(([name, amount]) => ({
        name,
        amount,
        value: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: colors[name] ?? "#64748b",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, []);

  const revenueBreakdown = useMemo(() => buildRevenueBreakdown(receiptsInRange), [receiptsInRange, buildRevenueBreakdown]);

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
      },
      {
        title: "Today's Attendance",
        value: todayAttendance.toLocaleString(),
        change: todayVsAvg,
        description: `vs 7-day daily avg`,
        icon: BarChart3,
        iconShell: "bg-slate-50",
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

  const getTrendIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    return change >= 0
      ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
      : <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />;
  };

  const getTrendColor = (change: number | null) => {
    if (change === null) return "text-muted-foreground";
    return change >= 0 ? "text-green-600" : "text-red-600";
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
          <Card key={index} className={statCardShell}>
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

      <Tabs defaultValue="overview" className="space-y-6">
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
              <CardTitle>Quick Report Export</CardTitle>
              <CardDescription>Export a filtered report for {RANGE_LABELS[rangeKey].toLowerCase()} in the format you need</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
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
                <Button className="shadow-sm hover:shadow-md transition-all" onClick={() => runExport(reportType, reportFormat)}>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => onNavigate?.('custom-reports')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Open Full Custom Report Builder
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
