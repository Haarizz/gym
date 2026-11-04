import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
  Users, DollarSign, Download, RefreshCw, BarChart3, FileText, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Minus,
  LayoutDashboard, UserPlus, Wallet, Clock, CalendarDays, ChevronDown, CalendarClock,
} from 'lucide-react';
import { toast } from "sonner";
import styles from "../components/analytics/community-analytics.module.css";
import rs from "../components/reports/reports-analytics.module.css";
import { membersService, Member as MemberApi } from "../utils/supabase/members-service";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { attendanceService, AttendanceStats } from "../utils/supabase/attendance-service";
import { dashboardService, ClassAttendance as DashboardClassAttendance } from "../utils/supabase/dashboard-service";
import { CustomReports } from "./custom-reports";
import { DayReport } from "../components/reports/DayReport";
import { withPrintFont } from "../utils/print-font";

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

// Categorical chart colours are fixed (not the user's theme) so slices stay distinct in
// every theme — same validated slots as the Analytics Dashboard.
const CATEGORY_COLORS: Record<string, string> = {
  Memberships: "#2a78d6",
  "Personal Training": "#eb6834",
  "Group Classes": "#1baf7a",
  Merchandise: "#6250d6",
  "Other Services": "#a8a69f",
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
  Cash: "#2a78d6",
  Card: "#1baf7a",
  Cheque: "#eb6834",
  "Bank Transfer": "#6250d6",
  "Online Payment": "#0e9fb5",
  Credit: "#b45309",
  "Credit Pending": "#c98a00",
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

// ── Presentation pieces (shared look with the Analytics Dashboard) ──────────

type IconT = React.ComponentType<{ size?: number; className?: string }>;
type ReportsTab = "overview" | "membership" | "revenue" | "operations" | "day" | "custom";

const TABS: { id: ReportsTab; label: string; icon: IconT }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "membership", label: "Membership", icon: Users },
  { id: "revenue", label: "Revenue", icon: Wallet },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "day", label: "Day Report", icon: CalendarDays },
  { id: "custom", label: "Custom Reports", icon: FileText },
];

const RANGE_CHIPS: { id: RangeKey; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "Year to date" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

type ReportType = "revenue" | "membership" | "attendance" | "summary";
type ReportFormat = "csv" | "excel" | "pdf";
const EXPORT_TYPES: [ReportType, string][] = [["summary", "Summary"], ["revenue", "Revenue"], ["membership", "Membership"], ["attendance", "Attendance"]];
const EXPORT_FORMATS: [ReportFormat, string][] = [["csv", "CSV"], ["excel", "Excel"], ["pdf", "PDF"]];

// Fixed chart colours (validated dataviz slots), light/dark — not the user's theme.
const LIGHT = { s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", grid: "#e9e8e3", axis: "#898781", soft: "#b7d3f6" };
const DARK = { s1: "#3987e5", s2: "#d95926", s3: "#199e70", grid: "#2c2c2a", axis: "#898781", soft: "#184f95" };

function usePalette() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

/** `invert` marks metrics where a rise is bad news (e.g. cancellations). */
function Delta({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct == null || Number.isNaN(pct)) return null;
  if (Math.abs(pct) < 0.05) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0%</span>;
  const up = pct > 0;
  const good = invert ? !up : up;
  return (
    <span className={styles.delta} data-tone={good ? "good" : "bad"} title={good ? "Better than the previous period" : "Worse than the previous period"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
    </span>
  );
}

function KpiTile({ icon: Icon, tone, label, value, change, invert, hint, active, onClick, small }: {
  icon: IconT; tone: string; label: string; value: string; change?: number | null; invert?: boolean;
  hint?: React.ReactNode; active?: boolean; onClick?: () => void; small?: boolean;
}) {
  const body = (
    <>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={`${styles.kpiIcon} ${small ? styles.kpiIconSm : ""}`} data-tone={tone}><Icon size={small ? 14 : 16} /></span>
      </div>
      <div className={small ? styles.kpiValueSm : styles.kpiValue}>{value}</div>
      <div className={styles.kpiFoot}>
        <Delta pct={change ?? null} invert={invert} />
        {hint && <span>{hint}</span>}
      </div>
    </>
  );
  const cls = `${styles.card} ${styles.kpi} ${active ? rs.kpiActive : ""}`;
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-pressed={active}>{body}</button>
    : <div className={cls}>{body}</div>;
}

function PanelHead({ title, sub, scope, children }: { title: string; sub?: React.ReactNode; scope?: string; children?: React.ReactNode }) {
  return (
    <div className={styles.panelHead}>
      <div>
        <h3 className={styles.panelTitle}>{title}{scope && <span className={styles.scope}>{scope}</span>}</h3>
        {sub && <div className={styles.panelSub}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{payload[0]?.payload?.tipLabel ?? label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <div key={p.dataKey ?? p.name} className={styles.tooltipRow}>
          <span className={styles.tooltipKey}>
            <span className={styles.swatch} style={{ ["--sw" as any]: p.payload?.color || p.color || p.stroke || p.fill }} />{p.name}
          </span>
          <span className={styles.tooltipVal}>{fmt(p.value, p)}</span>
        </div>
      ))}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; label: string;
}) {
  return (
    <div className={styles.seg} role="tablist" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={styles.segBtn} data-active={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function BarRows({ rows, fmt, empty }: {
  rows: { key: string; label: string; value: number; color: string; meta?: React.ReactNode }[]; fmt: (n: number) => string; empty: string;
}) {
  if (!rows.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className={styles.barRows}>
      {rows.map((r) => (
        <div key={r.key} className={styles.barRow}>
          <span className={styles.barName}>{r.label}</span>
          <span className={styles.barVal}>{fmt(r.value)}</span>
          <div className={styles.barTrack}>
            <div className={styles.track}><div className={styles.fill} style={{ width: `${(r.value / max) * 100}%`, ["--fill" as any]: r.color }} /></div>
            {r.meta != null && <span className={styles.barMeta}>{r.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const shortDate = (d: Date, withYear = false) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });

export function ReportsAnalytics({ onNavigate }: ReportsAnalyticsProps = {}) {
  const { currencyCode, currencyPrefix, formatCurrency } = useCurrency();
  const { activeBranchName, isAllBranches } = useBranch();
  const palette = usePalette();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compactMoney = useCallback(
    (n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions),
    [formatCurrency]
  );
  const axisTick = { fill: palette.axis, fontSize: 11 };

  const [members, setMembers] = useState<MemberApi[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [classAttendance, setClassAttendance] = useState<DashboardClassAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [reportsTab, setReportsTab] = useState<ReportsTab>('overview');
  const [activeKpiCard, setActiveKpiCard] = useState<number | null>(null);
  const [periodView, setPeriodView] = useState<'chart' | 'table'>('chart');
  const [periodSplit, setPeriodSplit] = useState<'category' | 'method'>('category');

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

  const revenueReportKpis: ReportKpi[] = [
    {
      title: "Total Revenue",
      value: `${currencyPrefix}${Math.round(totalRevenuePeriod).toLocaleString()}`,
      change: hasComparison ? pctChange(totalRevenuePeriod, prevTotalRevenue) : null,
      icon: DollarSign,
      tone: "green",
    },
    {
      title: "Avg Per Transaction",
      value: `${currencyPrefix}${Math.round(avgPerTransaction).toLocaleString()}`,
      change: hasComparison ? pctChange(avgPerTransaction, prevAvgPerTransaction) : null,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      title: "Membership Revenue",
      value: `${currencyPrefix}${Math.round(membershipRevenue).toLocaleString()}`,
      change: hasComparison ? pctChange(membershipRevenue, prevMembershipRevenue) : null,
      icon: Users,
      tone: "violet",
    },
    {
      title: "Training Revenue",
      value: `${currencyPrefix}${Math.round(trainingRevenue).toLocaleString()}`,
      change: hasComparison ? pctChange(trainingRevenue, prevTrainingRevenue) : null,
      icon: Activity,
      tone: "amber",
    },
  ];

  const revenueTrendRows = useMemo(() => reportPeriods.map((p) => ({ period: p.label, revenue: p.total })), [reportPeriods]);

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
        tone: "green",
        tab: "membership",
      },
      {
        title: "Avg Revenue / Member",
        value: `${currencyPrefix}${Math.round(arpm).toLocaleString()}`,
        change: arpmChange,
        description: `vs previous period`,
        icon: DollarSign,
        tone: "blue",
        tab: "revenue",
      },
      {
        title: "New Members",
        value: newMembersInRange.length.toLocaleString(),
        change: newMembersChange,
        description: `vs previous period`,
        icon: TrendingUp,
        tone: "teal",
        tab: "membership",
      },
      {
        title: "Class Utilization",
        value: `${classUtil.toFixed(0)}%`,
        change: null as number | null,
        description: "Avg across classes",
        icon: Activity,
        tone: "amber",
        tab: "operations",
      },
      {
        title: "Today's Attendance",
        value: todayAttendance.toLocaleString(),
        change: todayVsAvg,
        description: `vs 7-day daily avg`,
        icon: BarChart3,
        tone: "gray",
        tab: "operations",
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
    icon: IconT;
    tone: string;
    invert?: boolean;
    description?: string;
  };

  const membershipReportKpis: ReportKpi[] = [
    {
      title: "Total Members",
      value: membershipMetrics.total.toLocaleString(),
      change: null,
      icon: Users,
      tone: "green",
    },
    {
      title: "Active Members",
      value: membershipMetrics.active.toLocaleString(),
      change: null,
      icon: Activity,
      tone: "blue",
      description: `${membershipMetrics.retention.toFixed(1)}% retention rate`,
    },
    {
      title: "New Members",
      value: newMembersInRange.length.toLocaleString(),
      change: hasComparison ? pctChange(newMembersInRange.length, newMembersInPrevRange.length) : null,
      icon: TrendingUp,
      tone: "teal",
    },
    {
      title: "Cancellations",
      value: cancelledMembersInRange.length.toLocaleString(),
      change: hasComparison ? pctChange(cancelledMembersInRange.length, cancelledMembersInPrevRange.length) : null,
      invert: true,
      icon: ArrowDownRight,
      tone: "red",
    },
  ];

  const attendanceReportKpis: ReportKpi[] = [
    {
      title: "Classes Tracked",
      value: classAttendance.length.toLocaleString(),
      change: null,
      icon: BarChart3,
      tone: "green",
    },
    {
      title: "Avg Class Utilization",
      value: `${(classAttendance.length > 0 ? classAttendance.reduce((s, c) => s + (c.percentage || 0), 0) / classAttendance.length : 0).toFixed(0)}%`,
      change: null,
      icon: Activity,
      tone: "amber",
    },
    {
      title: "Today's Attendance",
      value: (attendanceStats?.totalToday ?? 0).toLocaleString(),
      change: (attendanceStats?.totalThisWeek ?? 0) / 7 > 0
        ? pctChange(attendanceStats?.totalToday ?? 0, (attendanceStats?.totalThisWeek ?? 0) / 7)
        : null,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      title: "Avg Visit Duration",
      value: membershipMetrics.avgVisitMinutes ? `${membershipMetrics.avgVisitMinutes} min` : "—",
      change: null,
      icon: Users,
      tone: "violet",
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

  const csvBuilders: Record<ReportType, () => string> = {
    revenue: buildRevenueCsv,
    membership: buildMembershipCsv,
    attendance: buildAttendanceCsv,
    summary: buildSummaryCsv,
  };

  const runExport = useCallback((type: ReportType, format: ReportFormat) => {
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
    w.document.write(withPrintFont(`
      <html><head><meta charset="utf-8" /><title>Report</title>
      <style>body{font-family:'Plus Jakarta Sans Variable',ui-sans-serif,system-ui;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f9fafb}</style>
      </head><body>
      <h1 style="margin:0 0 6px;font-size:18px;">${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
      <div style="color:#6b7280;font-size:12px;margin-bottom:16px;">Range: ${RANGE_LABELS[rangeKey]}</div>
      <table>${lines.map((cells, i) => `<tr>${cells.map((c) => `<${i === 0 ? 'th' : 'td'}>${c}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>
      <script>window.onload = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => window.print());</script>
      </body></html>
    `));
    w.document.close();
    toast.success("Print dialog opened (Save as PDF)");
  }, [csvBuilders, rangeKey, rangeLabel]);

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

    w.document.write(withPrintFont(`
      <html><head><meta charset="utf-8" /><title>Revenue Analysis Report</title>
      <style>
        body{font-family:'Plus Jakarta Sans Variable',ui-sans-serif,system-ui;padding:24px;color:#1f2937}
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
      <script>window.onload = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => window.print());</script>
      </body></html>
    `));
    w.document.close();
    toast.success("Print dialog opened (Save as PDF)");
  }, [currencyCode, revenueReportKpis, paymentBreakdown, reportPeriods, revenueBreakdown, rangeKey]);

  const periodText = rangeKey === "all"
    ? "All recorded activity"
    : `${shortDate(rangeStart)} – ${shortDate(rangeEnd, true)}`;
  const compareText = hasComparison ? `vs ${shortDate(prevStart)} – ${shortDate(prevEnd, true)}` : "no comparison period";
  const rangeScope = RANGE_LABELS[rangeKey];

  const peak = peakHours.reduce<PeakHourPoint | null>((best, p) => (!best || p.usage > best.usage ? p : best), null);
  const peakTotal = peakHours.reduce((s, p) => s + p.usage, 0);
  const avgClassUtil = classAttendance.length > 0
    ? classAttendance.reduce((s, c) => s + (c.percentage || 0), 0) / classAttendance.length
    : 0;
  const todayAttendance = attendanceStats?.totalToday ?? 0;

  const openTab = (tab: ReportsTab, kpiIndex: number | null = null) => {
    setReportsTab(tab);
    setActiveKpiCard(kpiIndex);
  };

  const moneyTip = (v: number) => money(v);
  const countTip = (v: number) => Number(v).toLocaleString();
  const pctTip = (v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

  const splitSeries = periodSplit === "category" ? revenueBreakdown : paymentBreakdown;
  const periodRows = reportPeriods.map((p) => {
    const row: Record<string, string | number> = { period: p.label, total: p.total };
    const source = periodSplit === "category" ? p.categories : p.methods;
    splitSeries.forEach((s) => { row[s.name] = source.find((x) => x.name === s.name)?.amount || 0; });
    return row;
  });

  if (loading && members.length === 0 && receipts.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.centered}>
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span>Loading reports…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Reports & Analytics</h1>
          <div className={styles.subtitle}>
            <span className={styles.branchChip}>{isAllBranches ? "All branches" : activeBranchName || "Current branch"}</span>
            <span>Comprehensive business intelligence and performance metrics</span>
            {lastRefreshed && (
              <span className={rs.updated}><Clock size={12} />Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />Export Report<ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{rangeScope}</DropdownMenuLabel>
              <DropdownMenuItem onClick={downloadRevenueReportPdf}>
                <FileText className="h-4 w-4 mr-2" />Revenue analysis (PDF)
              </DropdownMenuItem>
              {EXPORT_TYPES.map(([type, label]) => (
                <React.Fragment key={type}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
                  {EXPORT_FORMATS.map(([format, fLabel]) => (
                    <DropdownMenuItem key={format} onClick={() => runExport(type, format)}>
                      <Download className="h-4 w-4 mr-2" />{label} · {fLabel}
                    </DropdownMenuItem>
                  ))}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Period filter — scopes every "in range" figure below */}
      <div className={`${styles.card} ${styles.filters}`}>
        <div className={styles.chips} role="group" aria-label="Date range">
          {RANGE_CHIPS.map((c) => (
            <button key={c.id} type="button" className={styles.chip} data-active={rangeKey === c.id} aria-pressed={rangeKey === c.id} onClick={() => setRangeKey(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        {rangeKey === "custom" && (
          <div className={styles.customRange}>
            <Input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From" />
            <span className={styles.muted}>to</span>
            <Input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} aria-label="To" />
          </div>
        )}
        <div className={styles.filterEnd}>
          <CalendarClock size={14} />
          <span><b style={{ color: "var(--foreground)" }}>{periodText}</b> {compareText}</span>
        </div>
      </div>

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Headline KPIs — click to open the matching report */}
        <div className={rs.kpis5}>
          {kpiData.map((kpi, index) => (
            <KpiTile
              key={kpi.title}
              icon={kpi.icon}
              tone={kpi.tone}
              label={kpi.title}
              value={kpi.value}
              change={kpi.change}
              hint={kpi.description}
              active={activeKpiCard === index}
              onClick={() => openTab(kpi.tab as ReportsTab, index)}
            />
          ))}
        </div>

        {/* Report sections */}
        <div className={`${styles.card} ${rs.tabsBar}`} role="tablist" aria-label="Report sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={reportsTab === id} data-active={reportsTab === id} className={rs.tab} onClick={() => openTab(id)}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {reportsTab === "overview" && (
          <div className={rs.tabBody} key="overview">
            <div className={styles.cols2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Membership Growth Trend" sub="Member acquisition and retention over time" scope="Last 6 months" />
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <AreaChart data={membershipTrends} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="rpMembers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={palette.s1} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={palette.s1} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ stroke: palette.axis, strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="totalMembers" name="Total members" stroke={palette.s1} strokeWidth={2} fill="url(#rpMembers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendItem}><span className={styles.swatch} style={{ ["--sw" as any]: palette.s1 }} />Total members</span>
                </div>
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Revenue Distribution" sub="Revenue breakdown by service type" scope={rangeScope} />
                {revenueBreakdown.length === 0 ? (
                  <div className={styles.empty}>No receipts in this range.</div>
                ) : (
                  <div className={rs.donut}>
                    <div className={rs.donutChart}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={revenueBreakdown} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                            {revenueBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<ChartTip fmt={moneyTip} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className={rs.donutCenter}>
                        <div>
                          <div className={rs.donutTotal}>{compactMoney(totalRevenuePeriod)}</div>
                          <div className={rs.donutLabel}>collected</div>
                        </div>
                      </div>
                    </div>
                    <div className={rs.legendRows}>
                      {revenueBreakdown.map((b) => (
                        <div key={b.name} className={rs.legendRow}>
                          <span className={styles.swatch} style={{ ["--sw" as any]: b.color }} />
                          <span className={rs.legendName}>{b.name}</span>
                          <span className={rs.legendAmt}>{money(b.amount)}</span>
                          <span className={rs.legendPct}>{b.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead
                title="Peak Usage Hours"
                sub={peak ? <>Gym utilization throughout the day · busiest at <b>{peak.hour}</b> ({peak.usage.toLocaleString()} check-ins{peakTotal > 0 ? `, ${Math.round((peak.usage / peakTotal) * 100)}% of visits` : ""})</> : "Gym utilization throughout the day"}
                scope="Today"
              />
              {peakHours.length === 0 ? (
                <div className={styles.empty}>No attendance data available yet.</div>
              ) : (
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <BarChart data={peakHours} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="hour" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar dataKey="usage" name="Check-ins" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {peakHours.map((p) => <Cell key={p.hour} fill={peak && p.hour === peak.hour ? palette.s1 : palette.soft} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Membership ── */}
        {reportsTab === "membership" && (
          <div className={rs.tabBody} key="membership">
            <div className={rs.kpis4}>
              {membershipReportKpis.map((k) => (
                <KpiTile key={k.title} small icon={k.icon} tone={k.tone} label={k.title} value={k.value} change={k.change} invert={k.invert} hint={k.description ?? (k.change != null ? "vs previous period" : undefined)} />
              ))}
            </div>

            <div className={styles.cols2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Member Acquisition vs Churn" sub="Monthly new members vs cancellations" scope="Last 6 months" />
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <BarChart data={membershipTrends} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                      <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar dataKey="newMembers" name="New Members" fill={palette.s3} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="cancelledMembers" name="Cancelled" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendItem}><span className={styles.swatch} style={{ ["--sw" as any]: palette.s3 }} />New members</span>
                  <span className={styles.legendItem}><span className={styles.swatch} style={{ ["--sw" as any]: palette.s2 }} />Cancelled</span>
                </div>
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Member Demographics" sub="Age distribution of members" scope="All members" />
                <BarRows
                  rows={memberDemographics.map((d) => ({ key: d.ageGroup, label: d.ageGroup, value: d.count, color: palette.s1, meta: `${d.percentage}% of members` }))}
                  fmt={(n) => n.toLocaleString()}
                  empty="Add member date-of-birth to see demographics."
                />
              </div>
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Membership Metrics" sub="Key membership performance indicators" scope="All members" />
              <div className={rs.bigFacts}>
                <div className={rs.bigFact} data-tone="green">
                  <span className={styles.factLabel}>Retention Rate</span>
                  <span className={rs.bigFactValue}>{membershipMetrics.retention.toFixed(1)}%</span>
                </div>
                <div className={rs.bigFact} data-tone="blue">
                  <span className={styles.factLabel}>Active Members</span>
                  <span className={rs.bigFactValue}>{membershipMetrics.active.toLocaleString()}</span>
                </div>
                <div className={rs.bigFact} data-tone="violet">
                  <span className={styles.factLabel}>Avg. Membership Length</span>
                  <span className={rs.bigFactValue}>
                    {membershipMetrics.avgMembershipMonths > 0 ? `${membershipMetrics.avgMembershipMonths.toFixed(1)} mo` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Recent Signups & Cancellations" sub={`Member events within ${rangeScope.toLowerCase()}`} scope={rangeScope} />
              {membershipEvents.length === 0 ? (
                <div className={styles.empty}>No member events in this range.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Member</th><th>Event</th><th>Date</th><th>Detail</th></tr>
                    </thead>
                    <tbody>
                      {membershipEvents.map((e, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{e.name}</td>
                          <td>
                            <span className={styles.status} data-status={e.type === "Joined" ? "good" : "critical"}>
                              {e.type === "Joined" ? <UserPlus size={12} /> : <ArrowDownRight size={12} />}{e.type}
                            </span>
                          </td>
                          <td>{(e.date as Date).toLocaleDateString()}</td>
                          <td className={styles.muted} style={{ textTransform: "capitalize" }}>{e.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Revenue ── */}
        {reportsTab === "revenue" && (
          <div className={rs.tabBody} key="revenue">
            <div className={rs.kpis4}>
              {revenueReportKpis.map((k) => (
                <KpiTile key={k.title} small icon={k.icon} tone={k.tone} label={k.title} value={k.value} change={k.change} hint={k.change != null ? "vs previous period" : rangeScope} />
              ))}
            </div>

            <div className={styles.row2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Revenue Trends" sub="Monthly revenue collected" scope="Last 6 months" />
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <LineChart data={revenueTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => compactMoney(Number(v))} />
                      <Tooltip content={<ChartTip fmt={moneyTip} />} cursor={{ stroke: palette.axis, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke={palette.s1} strokeWidth={2.5} dot={{ r: 3, fill: palette.s1 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Revenue Summary" sub="By service type" scope={rangeScope} />
                <BarRows
                  rows={revenueBreakdown.map((b) => ({ key: b.name, label: b.name, value: b.amount, color: b.color, meta: `${b.value}% of total` }))}
                  fmt={money}
                  empty="No receipts found in this range."
                />
              </div>
            </div>

            <div className={styles.row2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Revenue by Period" sub={`Split by ${periodSplit === "category" ? "service type" : "payment method"}`} scope={rangeScope}>
                  <div className={rs.panelActions}>
                    <Seg label="Split by" value={periodSplit} onChange={setPeriodSplit} options={[["category", "Service"], ["method", "Payment"]]} />
                    <Seg label="Revenue by period view" value={periodView} onChange={setPeriodView} options={[["chart", "Chart"], ["table", "Table"]]} />
                  </div>
                </PanelHead>
                {revenueTrendRows.every((r) => !r.revenue) ? (
                  <div className={styles.empty}>No receipts in this range.</div>
                ) : periodView === "chart" ? (
                  <>
                    <div className={styles.chart}>
                      <ResponsiveContainer>
                        <BarChart data={periodRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid vertical={false} stroke={palette.grid} />
                          <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => compactMoney(Number(v))} />
                          <Tooltip content={<ChartTip fmt={moneyTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                          {splitSeries.map((s, i) => (
                            <Bar key={s.name} dataKey={s.name} name={s.name} stackId="split" fill={s.color} maxBarSize={44}
                              radius={i === splitSeries.length - 1 ? [4, 4, 0, 0] : undefined} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={styles.legend}>
                      {splitSeries.map((s) => (
                        <span key={s.name} className={styles.legendItem}><span className={styles.swatch} style={{ ["--sw" as any]: s.color }} />{s.name}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Period</th>
                          {splitSeries.map((s) => <th key={s.name} className={styles.num}>{s.name}</th>)}
                          <th className={styles.num}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodRows.map((r) => (
                          <tr key={String(r.period)}>
                            <td style={{ fontWeight: 600 }}>{r.period}</td>
                            {splitSeries.map((s) => <td key={s.name} className={`${styles.num} ${!r[s.name] ? styles.muted : ""}`}>{money(Number(r[s.name]) || 0)}</td>)}
                            <td className={styles.num} style={{ fontWeight: 700 }}>{money(Number(r.total))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          {splitSeries.map((s) => <td key={s.name} className={styles.num}>{money(s.amount)}</td>)}
                          <td className={styles.num}>{money(periodRows.reduce((sum, r) => sum + Number(r.total), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Payment Methods" sub="How members paid · pending credit shown separately" scope={rangeScope} />
                <BarRows
                  rows={paymentBreakdown.map((m) => ({ key: m.name, label: m.name, value: m.amount, color: m.color, meta: `${m.value}%` }))}
                  fmt={money}
                  empty="No payments in this range."
                />
              </div>
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Top Performing Plans" sub={`Highest revenue plans/transaction types within ${rangeScope.toLowerCase()}`} scope={rangeScope}>
                <Button variant="outline" size="sm" onClick={downloadRevenueReportPdf}>
                  <FileText className="h-4 w-4 mr-2" />Revenue report (PDF)
                </Button>
              </PanelHead>
              {topPlans.length === 0 ? (
                <div className={styles.empty}>No transactions in this range.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Plan / Transaction Type</th>
                        <th className={styles.num}>Transactions</th>
                        <th className={styles.num}>Revenue</th>
                        <th className={styles.num}>Avg / Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPlans.map((p) => (
                        <tr key={p.plan}>
                          <td style={{ fontWeight: 600 }}>{p.plan}</td>
                          <td className={styles.num}>{p.count.toLocaleString()}</td>
                          <td className={styles.num}>
                            <span className={styles.miniTrack}>
                              <span className={styles.miniFill} style={{ display: "block", width: `${(p.revenue / Math.max(1, topPlans[0].revenue)) * 100}%`, ["--fill" as any]: palette.s1 }} />
                            </span>
                            <b>{money(p.revenue)}</b>
                          </td>
                          <td className={`${styles.num} ${styles.muted}`}>{money(p.revenue / p.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Operations ── */}
        {reportsTab === "operations" && (
          <div className={rs.tabBody} key="operations">
            <div className={rs.kpis4}>
              {attendanceReportKpis.map((k) => (
                <KpiTile key={k.title} small icon={k.icon} tone={k.tone} label={k.title} value={k.value} change={k.change}
                  hint={k.title === "Today's Attendance" ? "vs 7-day daily avg" : k.title === "Avg Visit Duration" ? "today's completed visits" : "latest class data"} />
              ))}
            </div>

            <div className={styles.cols2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Class Attendance" sub="Latest attendance distribution by class" scope="Classes" />
                {classAttendance.length === 0 ? (
                  <div className={styles.empty}>No class attendance data available yet.</div>
                ) : (
                  <div className={styles.chart}>
                    <ResponsiveContainer>
                      <BarChart data={classAttendance} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke={palette.grid} />
                        <XAxis dataKey="class" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} interval="preserveStartEnd" />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<ChartTip fmt={pctTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                        <Bar dataKey="percentage" name="Utilization" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Operational Metrics" sub="Live stats from attendance and receipts" scope="Live" />
                <div className={rs.meters}>
                  <div>
                    <div className={rs.meterHead}><span>Today Attendance</span><span className={rs.meterValue}>{todayAttendance.toLocaleString()}</span></div>
                    <div className={styles.track}>
                      <div className={styles.fill} style={{ width: `${membershipMetrics.total > 0 ? Math.min(100, (todayAttendance / membershipMetrics.total) * 100) : 0}%`, ["--fill" as any]: palette.s3 }} />
                    </div>
                    <div className={rs.meterHint}>of {membershipMetrics.total.toLocaleString()} members</div>
                  </div>
                  <div>
                    <div className={rs.meterHead}><span>Avg Visit Duration</span><span className={rs.meterValue}>{membershipMetrics.avgVisitMinutes ? `${membershipMetrics.avgVisitMinutes} min` : "—"}</span></div>
                    <div className={styles.track}>
                      <div className={styles.fill} style={{ width: `${Math.min(100, (membershipMetrics.avgVisitMinutes / 120) * 100)}%`, ["--fill" as any]: palette.s1 }} />
                    </div>
                    <div className={rs.meterHint}>scale: 2 hours</div>
                  </div>
                  <div>
                    <div className={rs.meterHead}><span>Receipts In Range</span><span className={rs.meterValue}>{receiptsInRange.length.toLocaleString()}</span></div>
                    <div className={styles.track}>
                      <div className={styles.fill} style={{ width: `${receipts.length > 0 ? Math.min(100, (receiptsInRange.length / receipts.length) * 100) : 0}%`, ["--fill" as any]: "#6250d6" }} />
                    </div>
                    <div className={rs.meterHint}>of {receipts.length.toLocaleString()} receipts loaded · {rangeScope.toLowerCase()}</div>
                  </div>
                  <div>
                    <div className={rs.meterHead}><span>Avg Class Utilization</span><span className={rs.meterValue}>{avgClassUtil.toFixed(0)}%</span></div>
                    <div className={styles.track}>
                      <div className={styles.fill} style={{ width: `${Math.min(100, avgClassUtil)}%`, ["--fill" as any]: palette.s2 }} />
                    </div>
                    <div className={rs.meterHint}>across {classAttendance.length.toLocaleString()} classes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Day Report / Custom Reports (own components, unchanged) ── */}
        {reportsTab === "day" && (
          <div className={rs.tabBody} key="day">
            <DayReport />
          </div>
        )}
        {reportsTab === "custom" && (
          <div className={rs.tabBody} key="custom">
            <CustomReports embedded onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>
  );
}
