import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays, differenceInCalendarDays, endOfMonth, format, getDaysInMonth, isAfter, parseISO,
  startOfMonth, subDays, subMonths,
} from "date-fns";
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarClock, CheckCircle2, CircleDollarSign,
  Clock, Download, Dumbbell, Info, Loader2, MessageSquare, Minus, Receipt as ReceiptIcon, RefreshCw, Repeat,
  ShieldAlert, TrendingUp, UserMinus, UserPlus, Users, Wallet, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCurrency, toPlainCurrencyText } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import { staffService } from "../utils/supabase/staff-service";
import { membersService, type Member } from "../utils/supabase/members-service";
import { receiptsService, type Receipt } from "../utils/supabase/receipts-service";
import { financialAnalyticsService, type MonthlyTrendPoint, type ExpenseByCategory } from "../utils/supabase/financial-analytics-service";
import { attendanceService, type AttendanceRecord } from "../utils/supabase/attendance-service";
import { bookingService } from "../utils/supabase/booking-service";
import { communityService } from "../utils/supabase/community-service";
import { posApi } from "../pos/api";
import type { Sale } from "../pos/types";
import styles from "../components/analytics/community-analytics.module.css";

// ── Periods ─────────────────────────────────────────────────────────────────

type Preset = "today" | "yesterday" | "7d" | "this-month" | "last-month" | "30d" | "90d" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
];

// Receipts, check-ins and join/end dates are the gym's wall-clock time (LocalDateTime, no zone),
// so day keys are compared as plain "yyyy-MM-dd" strings and "today" is the local date.
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const dayKey = (s?: string | null) => (s ? String(s).slice(0, 10) : "");
const hourOf = (s?: string | null) => (s && s.length >= 13 ? Number(s.slice(11, 13)) : NaN);
const todayStart = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

interface Ranges { from: Date; to: Date; compareFrom: Date; compareTo: Date; days: number }

/** The selected range and the like-for-like period just before it (month-to-date vs the same days last month). */
function computeRanges(preset: Preset, custom: { from: string; to: string }): Ranges {
  const today = todayStart();
  let from: Date, to: Date, compareFrom: Date, compareTo: Date;
  switch (preset) {
    case "today": from = today; to = today; compareFrom = subDays(today, 1); compareTo = compareFrom; break;
    case "yesterday": from = subDays(today, 1); to = from; compareFrom = subDays(today, 2); compareTo = compareFrom; break;
    case "this-month": {
      from = startOfMonth(today); to = today;
      const prev = subMonths(from, 1);
      const end = addDays(prev, differenceInCalendarDays(to, from));
      compareFrom = prev; compareTo = isAfter(end, endOfMonth(prev)) ? endOfMonth(prev) : end;
      break;
    }
    case "last-month": {
      from = startOfMonth(subMonths(today, 1)); to = endOfMonth(from);
      compareFrom = startOfMonth(subMonths(from, 1)); compareTo = endOfMonth(compareFrom);
      break;
    }
    case "custom": {
      from = custom.from ? parseISO(custom.from) : startOfMonth(today);
      to = custom.to ? parseISO(custom.to) : today;
      if (isAfter(from, to)) [from, to] = [to, from];
      const n = differenceInCalendarDays(to, from) + 1;
      compareTo = subDays(from, 1); compareFrom = subDays(from, n);
      break;
    }
    default: {
      const n = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
      from = subDays(today, n - 1); to = today;
      compareTo = subDays(from, 1); compareFrom = subDays(from, n);
    }
  }
  return { from, to, compareFrom, compareTo, days: differenceInCalendarDays(to, from) + 1 };
}

const rangeLabel = (a: Date, b: Date) => {
  if (ymd(a) === ymd(b)) return format(a, "EEE d MMM yyyy");
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${format(a, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
};

// ── Colors (validated dataviz slots + blue sequential ramp; dark steps selected separately) ──

const LIGHT = { s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", compare: "#a8a69f", grid: "#e9e8e3", axis: "#898781",
  heat: ["#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#184f95"] };
const DARK = { s1: "#3987e5", s2: "#d95926", s3: "#199e70", compare: "#6f6d67", grid: "#2c2c2a", axis: "#898781",
  heat: ["#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"] };

function usePalette() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

// ── Domain helpers ──────────────────────────────────────────────────────────

// Every timestamp the backend sends (receipts, POS sales, check-ins, join/end dates) is a UTC
// instant with a trailing "Z" (the server runs in UTC). Days and hours are bucketed in the
// viewer's local time, the same way the Members and Billing pages display them.
const asDate = (iso?: string | null) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d; };
const localKey = (iso?: string | null) => { const d = asDate(iso); return d ? ymd(d) : ""; };

/** One payment that brought money in: a member receipt or a completed POS sale. */
interface Txn {
  key: string;            // local yyyy-MM-dd
  hour: number;           // local hour
  amount: number;         // money actually collected (never the on-credit part)
  source: SourceId;
  methods: [string, number][];
  staff: string;
}

/** Same labels as the Financial Analytics page (FinancialOverviewService.normalizeMethod). */
function normalizeMethod(method?: string | null): string {
  if (!method || !method.trim()) return "Other";
  const m = method.trim().toLowerCase();
  if (m.includes("+") || m.includes("mixed") || m.includes("split")) return "Split payment";
  if (m.includes("cash")) return "Cash";
  if (m.includes("card") || m.includes("visa") || m.includes("master") || m.includes("debit") || m.includes("credit card")) return "Card";
  if (m.includes("upi") || m.includes("online") || m.includes("gpay") || m.includes("google pay")
    || m.includes("phonepe") || m.includes("paytm") || m.includes("apple pay")) return "Online / UPI";
  if (m.includes("bank") || m.includes("transfer") || m.includes("neft") || m.includes("imps") || m.includes("rtgs")) return "Bank transfer";
  if (m.includes("cheque") || m.includes("check")) return "Cheque";
  if (m.includes("wallet")) return "Wallet";
  if (m.includes("credit")) return "On credit";
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/**
 * What a payment actually collected, per method — the backend's addSplits rule: split legs count
 * under their own method, anything "on credit" is owed rather than received, and the legs are
 * scaled down when a part-paid bill's breakdown describes more than was paid.
 */
function collectedByMethod(legs: { method?: string | null; amount?: number | null }[] | null | undefined, method: string | null | undefined, total: number): [string, number][] {
  if (total <= 0) return [];
  const real = (legs ?? []).filter(l => (Number(l.amount) || 0) > 0 && normalizeMethod(l.method) !== "On credit");
  const sum = real.reduce((s, l) => s + Number(l.amount), 0);
  if (sum > 0) {
    const factor = total >= sum ? 1 : total / sum;
    return real.map(l => [normalizeMethod(l.method), Number(l.amount) * factor]);
  }
  if ((legs ?? []).length > 0) return []; // every leg was on credit
  return normalizeMethod(method) === "On credit" ? [] : [[normalizeMethod(method), total]];
}

/** Receipt statuses that carry money in (as StaffProgressCalculator.REVENUE_RECEIPT_STATUSES). */
const REVENUE_RECEIPT_STATUSES = new Set(["Paid", "Partial"]);

function receiptTxn(r: Receipt): Txn | null {
  if (!REVENUE_RECEIPT_STATUSES.has(r.status)) return null;
  // A mobile purchase awaiting reception approval hasn't been confirmed as received yet; a rejected one never was.
  if (r.approval_status === "PENDING" || r.approval_status === "REJECTED") return null;
  const d = asDate(r.transaction_date || r.created_at);
  const paid = Number(r.paid_amount) || 0;
  if (!d || paid <= 0) return null;
  const methods = collectedByMethod(r.payment_breakdown, r.payment_method, paid);
  const amount = methods.reduce((s, [, v]) => s + v, 0);
  if (amount <= 0) return null;
  return { key: ymd(d), hour: d.getHours(), amount, source: sourceOf(r), methods, staff: r.processed_by || "Unassigned" };
}

function saleTxn(s: Sale): Txn | null {
  if (s.status !== "COMPLETED") return null;
  const d = asDate(s.createdAt);
  // Net of anything refunded back (as StaffProgressCalculator.posNet).
  const net = Math.max(0, (Number(s.totalAmount) || 0) - (Number(s.refundedAmount) || 0));
  if (!d || net <= 0) return null;
  const methods = collectedByMethod(s.paymentBreakdown, s.paymentMethod, net);
  const amount = methods.reduce((t, [, v]) => t + v, 0);
  if (amount <= 0) return null;
  return { key: ymd(d), hour: d.getHours(), amount, source: "pos", methods, staff: s.cashierName || "Unassigned" };
}

type SourceId = "membership" | "addon" | "class" | "daypass" | "dues" | "pos" | "other";
const SOURCES: { id: SourceId; label: string }[] = [
  { id: "membership", label: "Memberships" },
  { id: "addon", label: "Add-ons" },
  { id: "class", label: "Class bookings" },
  { id: "daypass", label: "Day passes" },
  { id: "dues", label: "Dues collected" },
  { id: "pos", label: "POS sales" },
  { id: "other", label: "Other" },
];

/** Receipt types the backend writes: New, Renewal, Add-on, Class Booking, Daily Entry, Payment (a
 *  settlement of an earlier bill), Freeze Charge. */
function sourceOf(r: Receipt): SourceId {
  const t = (r.transaction_type || "").toLowerCase();
  if (t.startsWith("new") || t.includes("renew") || t.includes("upgrade") || t.includes("downgrade")) return "membership";
  if (t.includes("add-on") || t.includes("addon")) return "addon";
  if (t.includes("class") || t.includes("booking")) return "class";
  if (t.includes("daily") || t.includes("day pass") || t.includes("walk")) return "daypass";
  if (t === "payment" || t.includes("settle")) return "dues";
  return "other";
}
const isRenewalBill = (r: Receipt) => (r.transaction_type || "").toLowerCase().includes("renew")
  && r.approval_status !== "REJECTED" && r.approval_status !== "PENDING" && r.status !== "Cancelled";

const endDateOf = (m: Member) => localKey(m.membership_end_date || m.expiry_date);
const joinDateOf = (m: Member) => localKey(m.join_date || m.created_at);
/** Same rule as the Members page's status: active, not frozen/suspended, and not past its (local) end date.
 *  The status column is never flipped to "expired" by a job, so the date decides. */
const isEffectivelyActive = (m: Member, todayKey: string) => {
  if (m.membership_status !== "active") return false;
  const end = endDateOf(m);
  return !end || end >= todayKey;
};
/** Plan ended (before today), not renewed since (renewing moves the end date), not frozen or suspended. */
const hasLapsed = (m: Member, todayKey: string) => {
  const end = endDateOf(m);
  return !!end && end < todayKey && !isEffectivelyActive(m, todayKey)
    && m.membership_status !== "frozen" && m.membership_status !== "suspended";
};
/** Minors and members billed to a family head never pay on their own account. */
const billedToHead = (m: Member) => !!(m.is_minor || (m as any).billed_to_head);
const planOf = (m: Member) => (m.membership_plan || m.membership_type || "No plan").trim() || "No plan";
/** Up to two initials from the words that start with a letter (skips "(Manager)"-style suffixes). */
const initials = (name: string) =>
  name.replace(/\([^)]*\)/g, " ").split(/\s+/).filter(p => /^\p{L}/u.test(p)).slice(0, 2).map(p => p[0]!.toUpperCase()).join("") || "?";
const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? null : 0);
const fmtPct = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) ? "—" : `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();
/** Share of a whole, whole percent — "<1%" for a sliver so it never reads as nothing. */
const fmtShare = (part: number, whole: number) => (whole <= 0 ? "—" : part > 0 && (part / whole) * 100 < 1 ? "<1%" : fmtPct((part / whole) * 100, 0));
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekdayIdx = (d: Date) => (d.getDay() + 6) % 7; // Monday first

// ── Small pieces ────────────────────────────────────────────────────────────

type IconT = React.ComponentType<{ size?: number; className?: string }>;

function Delta({ pct, upIsGood = true }: { pct: number | null | undefined; upIsGood?: boolean }) {
  if (pct == null || Number.isNaN(pct)) return <span className={styles.delta} data-tone="flat" title="Nothing to compare with in the previous period"><Minus size={12} />new</span>;
  if (Math.abs(pct) < 0.05) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0%</span>;
  const up = pct > 0;
  const good = up === upIsGood;
  return (
    <span className={styles.delta} data-tone={good ? "good" : "bad"} title={good ? "Better than the previous period" : "Worse than the previous period"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
    </span>
  );
}

function HeroKpi({ icon: Icon, tone, label, value, delta, foot, spark, sparkColor, onClick }: {
  icon: IconT; tone: string; label: string; value: string; delta?: React.ReactNode; foot: React.ReactNode;
  spark?: number[]; sparkColor?: string; onClick?: () => void;
}) {
  const body = (
    <>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiFoot}>{delta}<span>{foot}</span></div>
      {spark && spark.length > 1 && (
        <div className={styles.spark} aria-hidden>
          <ResponsiveContainer>
            <LineChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
              <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
  return onClick
    ? <button type="button" className={`${styles.card} ${styles.kpi}`} onClick={onClick}>{body}</button>
    : <div className={`${styles.card} ${styles.kpi}`}>{body}</div>;
}

function SmallKpi({ icon: Icon, tone, label, value, hint, delta, onClick }: {
  icon: IconT; tone: string; label: string; value: string; hint?: React.ReactNode; delta?: React.ReactNode; onClick?: () => void;
}) {
  const body = (
    <>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={tone}><Icon size={14} /></span>
      </div>
      <div className={styles.kpiValueSm}>{value}</div>
      {(delta || hint) && <div className={styles.kpiHint}>{delta}{delta && hint ? " · " : null}{hint}</div>}
    </>
  );
  return onClick
    ? <button type="button" className={`${styles.card} ${styles.kpi}`} onClick={onClick}>{body}</button>
    : <div className={`${styles.card} ${styles.kpi}`}>{body}</div>;
}

function Legend({ items }: { items: { label: string; color: string; kind?: "box" | "line" | "dash" }[] }) {
  return (
    <div className={styles.legend}>
      {items.map(i => (
        <span key={i.label} className={styles.legendItem}>
          <span className={i.kind === "line" ? styles.swatchLine : i.kind === "dash" ? styles.swatchDash : styles.swatch} style={{ ["--sw" as any]: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{payload[0]?.payload?.tipLabel ?? label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipKey}>
            <span className={styles.swatch} style={{ ["--sw" as any]: p.color || p.stroke || p.fill }} />{p.name}
          </span>
          <span className={styles.tooltipVal}>{fmt(p.value, p)}</span>
        </div>
      ))}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options, large, label }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; large?: boolean; label: string;
}) {
  return (
    <div className={`${styles.seg} ${large ? styles.segLg : ""}`} role="tablist" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={styles.segBtn} data-active={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

type View = "chart" | "table";
const VIEW_OPTIONS: [View, string][] = [["chart", "Chart"], ["table", "Table"]];

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

function BarRows({ rows, color, fmt, empty }: {
  rows: { key: string; label: string; value: number; meta?: React.ReactNode }[]; color: string; fmt: (n: number) => string; empty: string;
}) {
  if (!rows.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className={styles.barRows}>
      {rows.map(r => (
        <div key={r.key} className={styles.barRow}>
          <span className={styles.barName} title={r.label}>{r.label}</span>
          <span className={styles.barVal}>{fmt(r.value)}</span>
          <div className={styles.barTrack}>
            <div className={styles.track}><div className={styles.fill} style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, ["--fill" as any]: color }} /></div>
            {r.meta != null && <span className={styles.barMeta}>{r.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

type InsightType = "positive" | "info" | "warning" | "critical";
interface Insight { type: InsightType; title: string; detail: string }
const INSIGHT_META: Record<InsightType, { label: string; icon: IconT }> = {
  positive: { label: "Good", icon: CheckCircle2 },
  info: { label: "Note", icon: Info },
  warning: { label: "Watch", icon: AlertTriangle },
  critical: { label: "Act now", icon: XCircle },
};

// ── Data ────────────────────────────────────────────────────────────────────

interface StaffTargetRow { target: number; achieved: number; percentage: number }

interface BaseData {
  members: Member[];
  target: number;                              // this month's gym-wide revenue target (0 = none set)
  staffTargets: Map<string, StaffTargetRow>;    // this month's individual targets, by staff name
  monthly: MonthlyTrendPoint[];
  expenses: ExpenseByCategory[];
  ledger: { revenue: number; expenses: number; profit: number; margin: number } | null;
  bookings: any[];
  community: Awaited<ReturnType<typeof communityService.getEngagementStats>> | null;
}

interface RangeData {
  receipts: Receipt[];                          // bills and payments inside the fetch window only
  checkins: AttendanceRecord[] | null;          // null = attendance unavailable
  sales: Sale[] | null;                         // null = POS unavailable (no access / not set up)
}

type DeepTab = "risk" | "team" | "trainers" | "community" | "profit";

interface Props { onNavigate?: (section: string, params?: Record<string, any>) => void }

/** Every page of a paginated list (first page tells how many there are; the rest load in parallel). */
async function fetchAllPages<T>(load: (page: number) => Promise<{ rows: T[]; totalPages: number }>): Promise<T[]> {
  const first = await load(1);
  const rest: T[][] = [];
  for (let p = 2; p <= first.totalPages; p += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - p + 1) }, (_, i) => load(p + i)));
    batch.forEach(b => rest.push(b.rows));
  }
  return first.rows.concat(...rest);
}

// ── Page ────────────────────────────────────────────────────────────────────

export function CommunityAnalytics({ onNavigate }: Props = {}) {
  const { formatCurrency, currencyCode } = useCurrency();
  const { activeBranchId, activeBranchName, isAllBranches } = useBranch();
  const palette = usePalette();

  const [preset, setPreset] = useState<Preset>("this-month");
  const [custom, setCustom] = useState({ from: ymd(startOfMonth(new Date())), to: ymd(new Date()) });
  const [base, setBase] = useState<BaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangeData, setRangeData] = useState<RangeData | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [deepTab, setDeepTab] = useState<DeepTab>("risk");
  const [views, setViews] = useState<Record<string, View>>({});
  const [heatHover, setHeatHover] = useState<string | null>(null);

  const view = (id: string) => views[id] ?? "chart";
  const setView = (id: string) => (v: View) => setViews(p => ({ ...p, [id]: v }));

  const ranges = useMemo(() => computeRanges(preset, custom), [preset, custom]);
  const keys = useMemo(() => ({
    from: ymd(ranges.from), to: ymd(ranges.to), cFrom: ymd(ranges.compareFrom), cTo: ymd(ranges.compareTo),
    today: ymd(todayStart()), month: format(todayStart(), "yyyy-MM"),
  }), [ranges]);

  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compactMoney = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  // ── Load everything that isn't tied to the selected period ───────────────
  const loadBase = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const now = new Date();
      const [targets, members, monthly, dashboard, expenses, community, bookings] = await Promise.all([
        staffService.getTargets(now.getFullYear(), now.getMonth() + 1).catch(() => [] as any[]),
        // Members are required — a failure here must not render as "zero".
        fetchAllPages(async page => {
          const r = await membersService.getMembers({}, { page, limit: 5000 });
          return { rows: r.members, totalPages: r.pagination.totalPages };
        }),
        financialAnalyticsService.getMonthlyTrend(6).catch(() => [] as MonthlyTrendPoint[]),
        financialAnalyticsService.getDashboard().catch(() => null),
        financialAnalyticsService.getExpenseByCategory().catch(() => [] as ExpenseByCategory[]),
        communityService.getEngagementStats().catch(() => null),
        // Booking dates are calendar dates; ask for one extra day so "today" in any timezone is covered.
        bookingService.getBookings({ type: "class", startDate: ymd(subDays(todayStart(), 30)), endDate: ymd(addDays(todayStart(), 1)) }).catch(() => [] as any[]),
      ]);
      const institution = (targets as any[]).find(t => t.scope === "institution");
      const staffTargets = new Map<string, StaffTargetRow>();
      (targets as any[]).filter(t => t.scope === "individual" && t.staff_name).forEach(t => {
        const prev = staffTargets.get(t.staff_name) ?? { target: 0, achieved: 0, percentage: 0 };
        const target = prev.target + (Number(t.revenue_target) || 0);
        const achieved = prev.achieved + (Number(t.revenue_achieved) || 0);
        staffTargets.set(t.staff_name, { target, achieved, percentage: target > 0 ? (achieved / target) * 100 : 0 });
      });
      setBase({
        members,
        target: Number(institution?.revenue_target) || 0,
        staffTargets,
        monthly: monthly as MonthlyTrendPoint[],
        expenses: expenses as ExpenseByCategory[],
        ledger: dashboard ? {
          revenue: dashboard.totalRevenue ?? 0, expenses: dashboard.totalExpenses ?? 0,
          profit: dashboard.netIncome ?? ((dashboard.totalRevenue ?? 0) - (dashboard.totalExpenses ?? 0)),
          margin: dashboard.profitMargin ?? 0,
        } : null,
        bookings: bookings as any[],
        community,
      });
    } catch (e: any) {
      setLoadError(e?.message || "Couldn't load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase, activeBranchId]);

  // ── Check-ins and POS sales for the period, the comparison period and this month ──
  // The server filters these by UTC day, so the window is padded a day each side and the
  // rows are then bucketed by local day.
  const fetchWindow = useMemo(() => {
    const monthStart = startOfMonth(todayStart());
    const start = [ranges.compareFrom, monthStart].reduce((a, b) => (a < b ? a : b));
    const end = ranges.to > todayStart() ? ranges.to : todayStart();
    return { start: ymd(subDays(start, 1)), end: ymd(addDays(end, 1)) };
  }, [ranges]);

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    // Receipts only for the window the page shows — the whole history grows with every
    // year a gym is on GymBios (an imported gym brings years of it) and isn't needed.
    const receiptsTo = addDays(parseISO(fetchWindow.end), 1);
    const [receipts, checkins, sales] = await Promise.all([
      fetchAllPages(async page => {
        const r: any = await receiptsService.getReceipts({ from: parseISO(fetchWindow.start), to: receiptsTo }, { page, limit: 2000 });
        return { rows: (r?.receipts ?? []) as Receipt[], totalPages: Number(r?.pagination?.total_pages ?? r?.pagination?.totalPages ?? 1) };
      }).catch((e: any) => {
        // Required, like members: an error must not show as zero collections.
        setLoadError(e?.message || "Couldn't load receipts");
        return [] as Receipt[];
      }),
      attendanceService.getAttendanceRange(fetchWindow.start, fetchWindow.end).then(r => r.items).catch(() => null),
      fetchAllPages(async page => {
        const r = await posApi.sales({ status: "COMPLETED", from: fetchWindow.start, to: fetchWindow.end, page, size: 200 });
        return { rows: r.transactions, totalPages: r.pagination.totalPages };
      }).catch(() => null),
    ]);
    setRangeData({ receipts, checkins, sales });
    setRangeLoading(false);
  }, [fetchWindow.start, fetchWindow.end]);

  useEffect(() => { loadRange(); }, [loadRange, activeBranchId]);

  const refresh = () => { loadBase(); loadRange(); };

  // Every payment as one shape, bucketed by local day.
  const txns = useMemo<Txn[]>(() => {
    if (!base) return [];
    const out: Txn[] = [];
    (rangeData?.receipts ?? []).forEach(r => { const t = receiptTxn(r); if (t) out.push(t); });
    (rangeData?.sales ?? []).forEach(s => { const t = saleTxn(s); if (t) out.push(t); });
    return out;
  }, [base, rangeData]);

  // ── Period figures ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!base) return null;
    const inCur = (k: string) => !!k && k >= keys.from && k <= keys.to;
    const inPrev = (k: string) => !!k && k >= keys.cFrom && k <= keys.cTo;
    const cur = txns.filter(t => inCur(t.key));
    const prev = txns.filter(t => inPrev(t.key));
    const sum = (ts: Txn[]) => ts.reduce((s, t) => s + t.amount, 0);
    const collections = sum(cur), prevCollections = sum(prev);

    // Trend buckets: hours for a single day, days up to ~2 months, weeks beyond that.
    const mode: "hour" | "day" | "week" = ranges.days === 1 ? "hour" : ranges.days <= 62 ? "day" : "week";
    const bucketCount = mode === "hour" ? 24 : mode === "day" ? ranges.days : Math.ceil(ranges.days / 7);
    const bucketOf = (t: Txn, start: Date) => {
      if (mode === "hour") return t.hour;
      const d = differenceInCalendarDays(parseISO(t.key), start);
      return mode === "day" ? d : Math.floor(d / 7);
    };
    const curB = new Array(bucketCount).fill(0), prevB = new Array(bucketCount).fill(0);
    cur.forEach(t => { const b = bucketOf(t, ranges.from); if (b >= 0 && b < bucketCount) curB[b] += t.amount; });
    prev.forEach(t => { const b = bucketOf(t, ranges.compareFrom); if (b >= 0 && b < bucketCount) prevB[b] += t.amount; });
    const trend = curB.map((v, i) => {
      const label = mode === "hour" ? `${String(i).padStart(2, "0")}:00`
        : mode === "day" ? format(addDays(ranges.from, i), ranges.days <= 7 ? "EEE d" : "d MMM")
        : format(addDays(ranges.from, i * 7), "d MMM");
      const tipLabel = mode === "week" ? `Week of ${label}` : mode === "hour" ? `${label} – ${String(i).padStart(2, "0")}:59` : format(addDays(ranges.from, i), "EEE d MMM yyyy");
      return { label, tipLabel, current: Math.round(v), previous: Math.round(prevB[i]) };
    });

    // Sources
    const bySource = (ts: Txn[]) => {
      const m = new Map<SourceId, number>();
      ts.forEach(t => m.set(t.source, (m.get(t.source) || 0) + t.amount));
      return m;
    };
    const srcCur = bySource(cur), srcPrev = bySource(prev);
    const sources = SOURCES.map(s => ({ ...s, value: srcCur.get(s.id) || 0, prev: srcPrev.get(s.id) || 0 }))
      .filter(s => s.value > 0 || s.prev > 0);

    // Payment methods (split payments counted per method; sums to collections)
    const methods = new Map<string, number>();
    cur.forEach(t => t.methods.forEach(([k, v]) => methods.set(k, (methods.get(k) || 0) + v)));
    const methodRows = Array.from(methods.entries()).sort((a, b) => b[1] - a[1]);
    const paymentMethods = methodRows.length > 6
      ? [...methodRows.slice(0, 5), ["Other methods", methodRows.slice(5).reduce((s, [, v]) => s + v, 0)] as [string, number]]
      : methodRows;

    // Staff — who processed the receipt / rang up the sale
    const staff = new Map<string, { value: number; count: number }>();
    cur.forEach(t => {
      const e = staff.get(t.staff) || { value: 0, count: 0 };
      e.value += t.amount; e.count += 1; staff.set(t.staff, e);
    });
    const staffRows = Array.from(staff.entries()).map(([name, v]) => ({ name, ...v, target: base.staffTargets.get(name) ?? null }))
      .sort((a, b) => b.value - a.value);

    // Members
    const members = base.members;
    const joinedIn = (pred: (k: string) => boolean) => members.filter(m => pred(joinDateOf(m))).length;
    const newMembers = joinedIn(inCur), prevNewMembers = joinedIn(inPrev);
    const newBuckets = new Array(bucketCount).fill(0);
    if (mode !== "hour") members.forEach(m => {
      const k = joinDateOf(m);
      if (!inCur(k)) return;
      const d = differenceInCalendarDays(parseISO(k), ranges.from);
      const b = mode === "day" ? d : Math.floor(d / 7);
      if (b >= 0 && b < bucketCount) newBuckets[b] += 1;
    });
    const lapsedIn = (pred: (k: string) => boolean) => members.filter(m => hasLapsed(m, keys.today) && pred(endDateOf(m))).length;
    const lapsed = lapsedIn(inCur), prevLapsed = lapsedIn(inPrev);
    // Renewal bills raised in the period — paid or not (a renewal on account is still a renewal).
    const renewalsIn = (pred: (k: string) => boolean) => (rangeData?.receipts ?? []).filter(r => isRenewalBill(r) && pred(localKey(r.transaction_date || r.created_at))).length;
    const renewals = renewalsIn(inCur), prevRenewals = renewalsIn(inPrev);

    const payments = cur.length, prevPayments = prev.length;
    const avgTicket = payments ? collections / payments : 0, prevAvgTicket = prevPayments ? prevCollections / prevPayments : 0;

    return {
      collections, prevCollections, trend, mode, sources, paymentMethods, staffRows,
      newMembers, prevNewMembers, newBuckets, lapsed, prevLapsed, renewals, prevRenewals,
      payments, prevPayments, avgTicket, prevAvgTicket,
    };
  }, [base, rangeData, txns, keys, ranges]);

  // ── Point-in-time member figures (not tied to the period) ──────────────────
  const roster = useMemo(() => {
    if (!base) return null;
    const today = keys.today;
    const in14 = ymd(addDays(todayStart(), 14));
    const members = base.members;
    const active = members.filter(m => isEffectivelyActive(m, today));
    const frozen = members.filter(m => m.membership_status === "frozen").length;
    const expiring = active
      .filter(m => { const e = endDateOf(m); return e && e <= in14; })
      .map(m => ({ m, end: endDateOf(m), daysLeft: differenceInCalendarDays(parseISO(endDateOf(m)), todayStart()) }))
      .sort((a, b) => a.end.localeCompare(b.end));
    // A dependent billed to their family head renews on the head's bill, so only billing units carry a fee here.
    const expiringValue = expiring.filter(e => !billedToHead(e.m)).reduce((s, e) => s + (Number(e.m.membership_fee ?? e.m.monthly_fee) || 0), 0);
    const balanceOf = (m: Member) => Math.max(0, Number(m.outstanding_balance) || 0);
    const invoiceDueOf = (m: Member) => Math.max(0, Number(m.sales_invoice_due) || 0);
    const owing = members.filter(m => balanceOf(m) + invoiceDueOf(m) > 0);
    const outstanding = owing.reduce((s, m) => s + balanceOf(m), 0);
    const invoiceDue = owing.reduce((s, m) => s + invoiceDueOf(m), 0);

    // Plan mix of active members
    const plans = new Map<string, number>();
    active.forEach(m => plans.set(planOf(m), (plans.get(planOf(m)) || 0) + 1));
    const planRows = Array.from(plans.entries()).sort((a, b) => b[1] - a[1]);
    const planMix = planRows.length > 7
      ? [...planRows.slice(0, 6), ["Other plans", planRows.slice(6).reduce((s, [, v]) => s + v, 0)] as [string, number]]
      : planRows;

    // Churn risk — a transparent rule-based score over each member's real situation (not a trained model).
    const since = (k: string) => (k ? differenceInCalendarDays(todayStart(), parseISO(k)) : null);
    const risk = members.map(m => {
      if (m.membership_status === "frozen") return null; // a deliberate pause, not a churn signal
      const end = endDateOf(m);
      const daysExpired = hasLapsed(m, today) ? since(end) : null;
      const owed = balanceOf(m);
      const overdue = owed > 0 || m.payment_status === "overdue";
      const suspended = m.membership_status === "suspended";
      if (!(overdue || suspended || (daysExpired != null && daysExpired <= 90))) return null;
      const reasons: string[] = [];
      let score = 0;
      if (overdue) {
        const fee = Number(m.membership_fee ?? m.monthly_fee) || 0;
        score += owed > 0 && fee > 0 ? Math.min(35, (owed / fee) * 35) : 25;
        reasons.push(owed > 0 ? `owes ${money(owed)}` : "payment overdue");
      }
      if (daysExpired != null) {
        score += Math.min(35, 15 + daysExpired / 2);
        reasons.push(daysExpired === 0 ? "plan ended yesterday" : `plan ended ${daysExpired}d ago`);
      } else if (suspended) {
        score += 30; reasons.push("suspended");
      }
      // Payment recency only means something for members who pay on their own account.
      if (!billedToHead(m)) {
        const dPay = since(localKey(m.last_payment_date));
        if (dPay != null) { score += Math.min(20, Math.max(0, dPay - 30) / 4); if (dPay > 45) reasons.push(`last paid ${dPay}d ago`); }
        else { score += 10; reasons.push("no payment on record"); }
      }
      const probability = Math.max(20, Math.min(95, Math.round(score)));
      return { m, probability, tier: probability >= 70 ? "High" : probability >= 45 ? "Medium" : "Low", reasons };
    }).filter(Boolean) as { m: Member; probability: number; tier: "High" | "Medium" | "Low"; reasons: string[] }[];
    risk.sort((a, b) => b.probability - a.probability);

    // Member growth — joins vs lapses per month, last 12 months
    const growth = Array.from({ length: 12 }, (_, i) => {
      const mStart = startOfMonth(subMonths(todayStart(), 11 - i));
      const mk = format(mStart, "yyyy-MM");
      const joins = members.filter(m => joinDateOf(m).startsWith(mk)).length;
      const lapses = members.filter(m => hasLapsed(m, today) && endDateOf(m).startsWith(mk)).length;
      return { label: format(mStart, "MMM"), tipLabel: format(mStart, "MMMM yyyy"), joins, lapses, net: joins - lapses };
    });

    return { total: members.length, active: active.length, frozen, expiring, expiringValue, owing: owing.length, outstanding, invoiceDue, planMix, risk, growth };
  }, [base, keys.today, money]);

  // ── Check-ins (local days and hours) ────────────────────────────────────────
  const checkins = useMemo(() => {
    const items = rangeData?.checkins;
    if (!items) return null;
    const cur: Date[] = [];
    let prevTotal = 0;
    items.forEach(a => {
      const d = asDate(a.check_in_time);
      if (!d) return;
      const k = ymd(d);
      if (k >= keys.from && k <= keys.to) cur.push(d);
      else if (k >= keys.cFrom && k <= keys.cTo) prevTotal += 1;
    });
    return { cur, total: cur.length, prevTotal };
  }, [rangeData, keys]);

  const heat = useMemo(() => {
    const items = checkins?.cur ?? [];
    const grid: number[][] = WEEKDAYS.map(() => new Array(24).fill(0));
    let minH = 24, maxH = -1;
    items.forEach(d => {
      const h = d.getHours();
      grid[weekdayIdx(d)][h] += 1;
      minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    });
    if (maxH < 0) { minH = 6; maxH = 22; }
    minH = Math.min(minH, 6); maxH = Math.max(maxH, 21);
    const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
    const max = Math.max(...grid.flat(), 0);
    // How many times each weekday occurs in the range, for per-day averages.
    const occurrences = WEEKDAYS.map(() => 0);
    for (let i = 0; i < ranges.days; i++) occurrences[weekdayIdx(addDays(ranges.from, i))] += 1;
    const slots = WEEKDAYS.flatMap((d, di) => grid[di].map((v, h) => ({ day: d, di, h, v }))).filter(s => s.v > 0).sort((a, b) => b.v - a.v);
    const byDay = WEEKDAYS.map((d, di) => ({ day: d, total: grid[di].reduce((s, v) => s + v, 0), avg: occurrences[di] ? grid[di].reduce((s, v) => s + v, 0) / occurrences[di] : 0 }));
    const byHour = hours.map(h => ({ h, total: grid.reduce((s, row) => s + row[h], 0) }));
    return { grid, hours, max, occurrences, slots, byDay, byHour, total: items.length };
  }, [checkins, ranges]);

  const heatColor = (v: number) => {
    if (v <= 0 || heat.max <= 0) return undefined;
    const step = Math.min(4, Math.floor((v / heat.max) * 5 - 1e-9));
    return palette.heat[Math.max(0, step)];
  };

  // ── Target & month-end forecast (always this calendar month) ──────────────
  // Uses the same collections as the rest of the page (receipts + POS by local day), so
  // "This month" collections and the target card always show the same figure.
  const forecast = useMemo(() => {
    if (!base) return null;
    const today = todayStart();
    const daysInMonth = getDaysInMonth(today);
    const elapsed = today.getDate();
    const perDay = new Array(daysInMonth).fill(0);
    txns.forEach(t => { if (t.key.startsWith(keys.month)) perDay[Number(t.key.slice(8, 10)) - 1] += t.amount; });
    const achieved = perDay.reduce((s, v) => s + v, 0);
    const projected = elapsed > 0 ? (achieved / elapsed) * daysInMonth : 0;
    const remainingDays = daysInMonth - elapsed;
    const target = base.target;
    const neededPerDay = target > 0 && remainingDays > 0 ? Math.max(0, target - achieved) / remainingDays : 0;
    const status: "good" | "warning" | "critical" | "info" = target <= 0 ? "info"
      : achieved >= target || projected >= target ? "good" : projected >= target * 0.85 ? "warning" : "critical";
    let run = 0;
    const pace = perDay.map((v, i) => {
      run += v;
      return { label: String(i + 1), tipLabel: format(addDays(startOfMonth(today), i), "EEE d MMM"),
        actual: i < elapsed ? Math.round(run) : null, pace: target > 0 ? Math.round((target * (i + 1)) / daysInMonth) : null };
    });
    return { achieved, projected, target, daysInMonth, elapsed, remainingDays, neededPerDay, status, dailyRate: elapsed ? achieved / elapsed : 0, pace };
  }, [base, txns, keys.month]);

  // ── Trainers (class bookings, last 30 days) ─────────────────────────────────
  const trainers = useMemo(() => {
    const today = keys.today, start = ymd(subDays(todayStart(), 29));
    const map = new Map<string, { bookings: number; held: number; checkedIn: number; noShow: number; cancelled: number; revenue: number }>();
    (base?.bookings ?? []).forEach(b => {
      const day = dayKey(b.date);
      if (!day || day < start || day > today) return;
      const st = String(b.status || "").toLowerCase();
      if (st === "pending_approval") return; // not a booking yet
      const k = (b.trainerName || "Unassigned") as string;
      const e = map.get(k) || { bookings: 0, held: 0, checkedIn: 0, noShow: 0, cancelled: 0, revenue: 0 };
      if (st === "cancelled") e.cancelled += 1;
      else {
        e.bookings += 1;
        e.revenue += Math.max(0, (Number(b.price) || 0) - (Number(b.refundedAmount) || 0));
        // Show rate only counts sessions that have already happened.
        if (st === "checked-in") { e.checkedIn += 1; e.held += 1; }
        else if (st === "no-show") { e.noShow += 1; e.held += 1; }
        else if (day < today) e.held += 1; // confirmed but never checked in
      }
      map.set(k, e);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v, showRate: v.held ? (v.checkedIn / v.held) * 100 : null }))
      .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue);
  }, [base, keys.today]);

  // ── Insights (rule-based, from the figures above) ─────────────────────────
  const insights = useMemo<Insight[]>(() => {
    if (!stats || !roster || !forecast) return [];
    const out: Insight[] = [];
    const ch = pctChange(stats.collections, stats.prevCollections);
    if (ch != null && stats.prevCollections > 0 && Math.abs(ch) >= 10) {
      out.push(ch > 0
        ? { type: "positive", title: `Collections up ${fmtPct(ch, 0)}`, detail: `${money(stats.collections)} vs ${money(stats.prevCollections)} in ${rangeLabel(ranges.compareFrom, ranges.compareTo)}.` }
        : { type: "warning", title: `Collections down ${fmtPct(Math.abs(ch), 0)}`, detail: `${money(stats.collections)} vs ${money(stats.prevCollections)} in ${rangeLabel(ranges.compareFrom, ranges.compareTo)}.` });
    }
    const movers = stats.sources.map(s => ({ ...s, diff: s.value - s.prev })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    if (movers[0] && Math.round(Math.abs(movers[0].diff)) > 0 && stats.prevCollections > 0) {
      const s = movers[0];
      out.push({ type: s.diff > 0 ? "positive" : "warning", title: `${s.label} ${s.diff > 0 ? "up" : "down"} the most`,
        detail: `${s.diff > 0 ? "+" : "−"}${money(Math.abs(s.diff))} vs the previous period (${money(s.prev)} → ${money(s.value)}).` });
    }
    if (forecast.target > 0) {
      if (forecast.achieved >= forecast.target) out.push({ type: "positive", title: "Monthly target reached", detail: `${money(forecast.achieved)} collected against ${money(forecast.target)}${forecast.remainingDays > 0 ? `, with ${forecast.remainingDays} day${forecast.remainingDays === 1 ? "" : "s"} to go` : ""}.` });
      else if (forecast.status === "good") out.push({ type: "positive", title: "On pace for the monthly target", detail: `At ${money(forecast.dailyRate)}/day the month ends near ${money(forecast.projected)}, above the ${money(forecast.target)} target.` });
      else out.push({ type: forecast.status === "critical" ? "critical" : "warning", title: "Behind the monthly target pace",
        detail: `At ${money(forecast.dailyRate)}/day the month ends near ${money(forecast.projected)}. ${forecast.remainingDays > 0 ? `${money(forecast.neededPerDay)}/day is needed from here to reach ${money(forecast.target)}.` : `The target was ${money(forecast.target)}.`}` });
    }
    const high = roster.risk.filter(r => r.tier === "High").length;
    if (high > 0) out.push({ type: "critical", title: `${high} member${high === 1 ? "" : "s"} at high churn risk`, detail: "Large unpaid balances, plans that ended without renewal, or long gaps since the last payment. See Churn risk below." });
    if (roster.expiring.length > 0) out.push({ type: "info", title: `${roster.expiring.length} plan${roster.expiring.length === 1 ? "" : "s"} end in the next 14 days`,
      detail: roster.expiringValue > 0 ? `About ${money(roster.expiringValue)} in renewals if they all renew at their current fee.` : "Follow up before the end date." });
    if (stats.lapsed > stats.newMembers) out.push({ type: "warning", title: "More plans lapsed than members joined", detail: `${stats.lapsed} plan${stats.lapsed === 1 ? "" : "s"} ended without renewal vs ${stats.newMembers} new member${stats.newMembers === 1 ? "" : "s"} in this period.` });
    else if (stats.newMembers > stats.lapsed) out.push({ type: "positive", title: "Membership is growing", detail: `${stats.newMembers} joined vs ${stats.lapsed} lapsed in this period (net +${stats.newMembers - stats.lapsed}).` });
    if (roster.outstanding + roster.invoiceDue > 0) out.push({ type: "warning", title: `${money(roster.outstanding + roster.invoiceDue)} in unpaid dues`,
      detail: `${roster.owing} member${roster.owing === 1 ? "" : "s"} owe money${roster.invoiceDue > 0 ? ` (${money(roster.invoiceDue)} of it on product invoices)` : ""}.` });
    if (heat.slots[0] && heat.total >= 20) {
      const s = heat.slots[0];
      out.push({ type: "info", title: `Busiest hour: ${s.day} ${String(s.h).padStart(2, "0")}:00`, detail: `${s.v} check-ins started between ${String(s.h).padStart(2, "0")}:00 and ${String(s.h).padStart(2, "0")}:59 across the ${heat.occurrences[s.di]} ${WEEKDAY_NAMES[s.di]}${heat.occurrences[s.di] === 1 ? "" : "s"} in this period (of ${fmtInt(heat.total)} check-ins in total).` });
    }
    return out;
  }, [stats, roster, forecast, heat, money, ranges]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!stats || !roster) return;
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows: unknown[][] = [
      ["Analytics Dashboard", isAllBranches ? "All branches" : activeBranchName], ["Period", rangeLabel(ranges.from, ranges.to)],
      ["Compared with", rangeLabel(ranges.compareFrom, ranges.compareTo)], ["Currency", currencyCode], [],
      ["Metric", "This period", "Previous period", "Change %"],
      ["Collections", Math.round(stats.collections), Math.round(stats.prevCollections), fmtPct(pctChange(stats.collections, stats.prevCollections))],
      ["Payments", stats.payments, stats.prevPayments, fmtPct(pctChange(stats.payments, stats.prevPayments))],
      ["Average payment", Math.round(stats.avgTicket), Math.round(stats.prevAvgTicket), fmtPct(pctChange(stats.avgTicket, stats.prevAvgTicket))],
      ["New members", stats.newMembers, stats.prevNewMembers, fmtPct(pctChange(stats.newMembers, stats.prevNewMembers))],
      ["Renewals", stats.renewals, stats.prevRenewals, fmtPct(pctChange(stats.renewals, stats.prevRenewals))],
      ["Lapsed (not renewed)", stats.lapsed, stats.prevLapsed, fmtPct(pctChange(stats.lapsed, stats.prevLapsed))],
      ["Check-ins", checkins?.total ?? "", checkins?.prevTotal ?? "", checkins ? fmtPct(pctChange(checkins.total, checkins.prevTotal)) : ""], [],
      ["Now", "Value"], ["Active members", roster.active], ["Frozen", roster.frozen], ["Expiring in 14 days", roster.expiring.length],
      ["Members with dues", roster.owing], ["Outstanding member balances", Math.round(roster.outstanding)], ["Unpaid product invoices", Math.round(roster.invoiceDue)], [],
      ["Source", "This period", "Previous period"], ...stats.sources.map(s => [s.label, Math.round(s.value), Math.round(s.prev)]), [],
      ["Payment method", "Amount"], ...stats.paymentMethods.map(([k, v]) => [k, Math.round(v)]), [],
      ["Trend", "This period", "Previous period"], ...stats.trend.map(t => [t.tipLabel, t.current, t.previous]), [],
      ["Staff", "Collections", "Payments", "Monthly target", "Achieved toward target"], ...stats.staffRows.map(s => [s.name, Math.round(s.value), s.count, s.target ? Math.round(s.target.target) : "", s.target ? Math.round(s.target.achieved) : ""]), [],
      ["Plan", "Active members"], ...roster.planMix.map(([k, v]) => [k, v]), [],
      ["Month", "Joined", "Lapsed", "Net"], ...roster.growth.map(g => [g.tipLabel, g.joins, g.lapses, g.net]), [],
      ["Busiest check-in slots", "Check-ins"], ...heat.slots.slice(0, 15).map(s => [`${s.day} ${String(s.h).padStart(2, "0")}:00`, s.v]), [],
      ["Churn risk", "Member ID", "Risk %", "Tier", "Reasons"], ...roster.risk.map(r => [r.m.name, r.m.member_id ?? "", r.probability, r.tier, toPlainCurrencyText(r.reasons.join("; "))]), [],
      ["Plans ending in 14 days", "Member ID", "Plan", "End date", "Days left"], ...roster.expiring.map(e => [e.m.name, e.m.member_id ?? "", planOf(e.m), e.end, e.daysLeft]),
    ];
    const csv = rows.map(r => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `analytics_${keys.from}_${keys.to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported — opens in Excel");
  };

  const openMember = (m: Member) => onNavigate?.("member-history-analytics", { memberId: m.id });
  const scrollTo = (id: string, tab?: DeepTab) => {
    if (tab) setDeepTab(tab);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!base && loading) {
    return <div className={styles.root}><div className={styles.centered}><Loader2 className="animate-spin" size={28} />Loading analytics…</div></div>;
  }
  if (!base && loadError) {
    return (
      <div className={styles.root}>
        <div className={styles.centered}>
          <AlertTriangle size={28} />
          <div>Analytics couldn't load: {loadError}</div>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>
        </div>
      </div>
    );
  }
  if (!stats || !roster || !forecast) return null;

  const axisTick = { fill: palette.axis, fontSize: 11 };
  const prevLabel = rangeLabel(ranges.compareFrom, ranges.compareTo);
  const periodText = rangeLabel(ranges.from, ranges.to);
  const trendSub = stats.mode === "hour" ? "Hour by hour" : stats.mode === "day" ? "Day by day" : "Week by week";
  const moneyTip = (v: number) => money(Number(v));
  const countTip = (v: number) => fmtInt(Number(v));
  const highRisk = roster.risk.filter(r => r.tier === "High").length;
  const tierCounts = { High: highRisk, Medium: roster.risk.filter(r => r.tier === "Medium").length, Low: roster.risk.filter(r => r.tier === "Low").length };
  const checkinDelta = checkins ? pctChange(checkins.total, checkins.prevTotal) : null;
  const sourceTotal = stats.sources.reduce((s, x) => s + x.value, 0);
  const methodTotal = stats.paymentMethods.reduce((s, [, v]) => s + v, 0);
  const meterMax = Math.max(forecast.target, forecast.projected, forecast.achieved, 1);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Analytics Dashboard</h1>
          <div className={styles.subtitle}>
            <span className={styles.branchChip}>{isAllBranches ? "All branches" : activeBranchName || "Current branch"}</span>
            <span>Collections, members, attendance and retention in one view</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading || rangeLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || rangeLoading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </div>

      {/* One filter row scopes every period figure below */}
      <div className={`${styles.card} ${styles.filters}`}>
        <div className={styles.chips} role="group" aria-label="Period">
          {PRESETS.map(p => (
            <button key={p.id} type="button" className={styles.chip} data-active={preset === p.id} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className={styles.customRange}>
            <Input type="date" value={custom.from} max={custom.to || undefined} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} aria-label="From" />
            <span className={styles.muted}>to</span>
            <Input type="date" value={custom.to} min={custom.from || undefined} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} aria-label="To" />
          </div>
        )}
        <div className={styles.filterEnd}>
          <CalendarClock size={14} /><span><b style={{ color: "var(--foreground)" }}>{periodText}</b> vs {prevLabel}</span>
        </div>
      </div>

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Hero KPIs */}
        <div className={styles.heroKpis}>
          <HeroKpi icon={CircleDollarSign} tone="blue" label="Collections" value={money(stats.collections)}
            delta={<Delta pct={pctChange(stats.collections, stats.prevCollections)} />} foot={`vs ${money(stats.prevCollections)}${rangeData && !rangeData.sales ? " · excl. POS" : ""}`}
            spark={stats.trend.map(t => t.current)} sparkColor={palette.s1} onClick={() => scrollTo("ca-trend")} />
          <HeroKpi icon={ReceiptIcon} tone="violet" label="Average payment" value={money(stats.avgTicket)}
            delta={<Delta pct={pctChange(stats.avgTicket, stats.prevAvgTicket)} />} foot={`${fmtInt(stats.payments)} payments`} />
          <HeroKpi icon={UserPlus} tone="green" label="New members" value={fmtInt(stats.newMembers)}
            delta={<Delta pct={pctChange(stats.newMembers, stats.prevNewMembers)} />} foot={`vs ${fmtInt(stats.prevNewMembers)}`}
            spark={stats.mode === "hour" ? undefined : stats.newBuckets} sparkColor={palette.s3} onClick={() => scrollTo("ca-growth")} />
          <HeroKpi icon={Users} tone="teal" label="Active members" value={fmtInt(roster.active)}
            foot={`${fmtPct(roster.total ? (roster.active / roster.total) * 100 : 0, 0)} of ${fmtInt(roster.total)} · ${roster.frozen} frozen`}
            onClick={() => scrollTo("ca-plans")} />
        </div>

        <div className={styles.kpis}>
          <SmallKpi icon={Repeat} tone="blue" label="Renewals" value={fmtInt(stats.renewals)} delta={<Delta pct={pctChange(stats.renewals, stats.prevRenewals)} />} hint="this period" />
          <SmallKpi icon={UserMinus} tone="orange" label="Lapsed" value={fmtInt(stats.lapsed)} delta={<Delta pct={pctChange(stats.lapsed, stats.prevLapsed)} upIsGood={false} />} hint="ended, not renewed" onClick={() => scrollTo("ca-deep", "risk")} />
          <SmallKpi icon={Activity} tone="violet" label="Check-ins" value={checkins ? fmtInt(checkins.total) : "—"} delta={checkins ? <Delta pct={checkinDelta} /> : undefined}
            hint={checkins ? `${(checkins.total / Math.max(1, ranges.days)).toLocaleString(undefined, { maximumFractionDigits: checkins.total / Math.max(1, ranges.days) < 10 ? 1 : 0 })}/day` : "unavailable"} onClick={() => scrollTo("ca-heat")} />
          <SmallKpi icon={CalendarClock} tone="amber" label="Renewals due" value={fmtInt(roster.expiring.length)} hint="next 14 days" onClick={() => scrollTo("ca-pipeline")} />
          <SmallKpi icon={ShieldAlert} tone="red" label="High churn risk" value={fmtInt(highRisk)} hint={`${roster.risk.length} flagged in total`} onClick={() => scrollTo("ca-deep", "risk")} />
          <SmallKpi icon={Wallet} tone="gray" label="Unpaid dues" value={money(roster.outstanding + roster.invoiceDue)}
            hint={`${roster.owing} member${roster.owing === 1 ? "" : "s"}${roster.invoiceDue > 0 ? ` · ${money(roster.invoiceDue)} invoices` : ""}`} />
        </div>

        {/* Collections trend + target / insights */}
        <div className={styles.row2}>
          <div id="ca-trend" className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Collections trend" sub={`${trendSub} · dashed line is ${prevLabel}`}>
              <Seg label="Trend view" value={view("trend")} onChange={setView("trend")} options={VIEW_OPTIONS} />
            </PanelHead>
            {view("trend") === "chart" ? (
              <>
                <Legend items={[{ label: "This period", color: palette.s1, kind: "line" }, { label: "Previous period", color: palette.compare, kind: "dash" }]} />
                <div className={styles.chartFill}>
                  <ResponsiveContainer>
                    <ComposedChart data={stats.trend} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="caTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={palette.s1} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={palette.s1} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} minTickGap={16} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={v => compactMoney(Number(v))} />
                      <Tooltip content={<ChartTip fmt={moneyTip} />} cursor={{ stroke: palette.axis, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="previous" name="Previous period" stroke={palette.compare} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                      <Area type="monotone" dataKey="current" name="This period" stroke={palette.s1} strokeWidth={2} fill="url(#caTrendFill)" dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className={styles.tableWrap} style={{ maxHeight: 340 }}>
                <table className={styles.table}>
                  <thead><tr><th>{stats.mode === "hour" ? "Hour" : stats.mode === "day" ? "Day" : "Week"}</th><th className={styles.num}>This period</th><th className={styles.num}>Previous</th><th className={styles.num}>Change</th></tr></thead>
                  <tbody>{stats.trend.map(t => (
                    <tr key={t.tipLabel}><td>{t.tipLabel}</td><td className={styles.num}>{money(t.current)}</td><td className={`${styles.num} ${styles.muted}`}>{money(t.previous)}</td><td className={styles.num}><Delta pct={pctChange(t.current, t.previous)} /></td></tr>
                  ))}</tbody>
                  <tfoot><tr><td>Total</td><td className={styles.num}>{money(stats.collections)}</td><td className={styles.num}>{money(stats.prevCollections)}</td><td className={styles.num}><Delta pct={pctChange(stats.collections, stats.prevCollections)} /></td></tr></tfoot>
                </table>
              </div>
            )}
          </div>

          <div className={styles.stack}>
            <div className={`${styles.card} ${styles.panel}`} style={{ flex: 1 }}>
              <PanelHead title="Monthly target" scope={format(todayStart(), "MMMM")}>
                {forecast.target > 0 && (
                  <span className={styles.status} data-status={forecast.status}>
                    {forecast.status === "good" ? <CheckCircle2 size={12} /> : forecast.status === "warning" ? <AlertTriangle size={12} /> : <XCircle size={12} />}
                    {forecast.achieved >= forecast.target ? "Reached" : forecast.status === "good" ? "On track" : forecast.status === "warning" ? "Slightly behind" : "Behind"}
                  </span>
                )}
              </PanelHead>
              <div className={styles.targetHead}>
                <span className={styles.targetValue}>{money(forecast.achieved)}</span>
                <span className={styles.targetOf}>{forecast.target > 0 ? `of ${money(forecast.target)} · ${fmtPct((forecast.achieved / forecast.target) * 100, 0)}` : "collected this month"}</span>
              </div>
              <div className={styles.meter} role="img" aria-label={`Achieved ${fmtPct(forecast.target ? (forecast.achieved / forecast.target) * 100 : 0, 0)} of target; projected ${money(forecast.projected)}`}>
                <div className={styles.meterProjected} style={{ width: `${Math.min(100, (forecast.projected / meterMax) * 100)}%` }} />
                <div className={styles.meterFill} style={{ width: `${Math.min(100, (forecast.achieved / meterMax) * 100)}%` }} />
                {forecast.target > 0 && <div className={styles.meterTick} style={{ left: `calc(${Math.min(100, (forecast.target / meterMax) * 100)}% - 1px)` }} title="Target" />}
              </div>
              <Legend items={[{ label: "Collected", color: palette.s1 }, { label: "Projected month-end", color: `color-mix(in srgb, ${palette.s1} 28%, transparent)` }, ...(forecast.target > 0 ? [{ label: "Target", color: "var(--foreground)", kind: "line" as const }, { label: "Even pace", color: palette.compare, kind: "dash" as const }] : [])]} />
              <div className={styles.chartPace} aria-label="Month to date, cumulative">
                <ResponsiveContainer>
                  <LineChart data={forecast.pace} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} interval={6} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} tickFormatter={v => compactMoney(Number(v))} />
                    <Tooltip content={<ChartTip fmt={moneyTip} />} cursor={{ stroke: palette.axis, strokeWidth: 1 }} />
                    {forecast.target > 0 && <Line type="linear" dataKey="pace" name="Even pace to target" stroke={palette.compare} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
                    <Line type="monotone" dataKey="actual" name="Collected so far" stroke={palette.s1} strokeWidth={2} dot={false} connectNulls={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.facts} style={{ marginTop: "auto" }}>
                <div className={styles.fact}><span className={styles.factLabel}>Projected month-end</span><span className={styles.factValue}>{money(forecast.projected)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Current pace</span><span className={styles.factValue}>{money(forecast.dailyRate)}/day</span></div>
                {forecast.target > 0 && forecast.achieved < forecast.target && (
                  <div className={styles.fact}><span className={styles.factLabel}>Needed to hit target</span><span className={styles.factValue}>{forecast.remainingDays > 0 ? `${money(forecast.neededPerDay)}/day` : "—"}</span></div>
                )}
                <div className={styles.fact}><span className={styles.factLabel}>Days left</span><span className={styles.factValue}>{forecast.remainingDays} of {forecast.daysInMonth}</span></div>
              </div>
              {forecast.target <= 0 && <div className={styles.note}>No monthly revenue target is set. Add one in Target &amp; Commission to track pace.</div>}
            </div>

          </div>
        </div>

        <div className={`${styles.card} ${styles.panel}`}>
          <PanelHead title="Insights" sub="Rule-based, from the figures on this page" />
          {insights.length === 0 ? <div className={styles.empty}>Not enough activity in this period to say anything useful yet.</div> : (
            <div className={styles.insightGrid}>
              {insights.slice(0, 6).map((i, idx) => {
                const meta = INSIGHT_META[i.type]; const Icon = meta.icon;
                return (
                  <div key={idx} className={styles.insight} data-type={i.type}>
                    <span className={styles.insightIcon}><Icon size={15} /></span>
                    <div>
                      <div className={styles.insightTag}>{meta.label}</div>
                      <div className={styles.insightTitle}>{i.title}</div>
                      <div className={styles.insightDetail}>{i.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Where the money came from */}
        <div className={styles.cols2}>
          <div className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Collections by source" sub={`Share of ${money(sourceTotal)} · change vs previous period${rangeData && !rangeData.sales ? " · POS sales unavailable" : ""}`} />
            <BarRows color={palette.s1} fmt={money} empty="No collections in this period."
              rows={stats.sources.map(s => ({ key: s.id, label: s.label, value: s.value,
                meta: <>{fmtShare(s.value, sourceTotal)} · <Delta pct={pctChange(s.value, s.prev)} /></> }))} />
          </div>
          <div className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Payment methods" sub="Split payments counted per method" />
            <BarRows color={palette.s1} fmt={money} empty="No payments in this period."
              rows={stats.paymentMethods.map(([k, v]) => ({ key: k, label: k, value: v, meta: fmtShare(v, methodTotal) }))} />
          </div>
        </div>

        {/* Attendance heatmap + renewals due */}
        <div className={styles.row2}>
          <div id="ca-heat" className={`${styles.card} ${styles.panel} ${rangeLoading ? styles.loadingVeil : ""}`}>
            <PanelHead title="When members train" sub={`Check-ins by weekday and hour · ${fmtInt(heat.total)} in ${periodText}`}>
              <Seg label="Heatmap view" value={view("heat")} onChange={setView("heat")} options={VIEW_OPTIONS} />
            </PanelHead>
            {!checkins ? <div className={styles.empty}>Check-in data is unavailable right now.</div>
              : heat.total === 0 ? <div className={styles.empty}><Clock size={22} />No check-ins in this period.</div>
              : view("heat") === "chart" ? (
                <>
                  <div className={styles.heatWrap}>
                    {/* Hover readout below; keyboard and screen-reader users get the same numbers from the Table view. */}
                    <div className={styles.heat} style={{ ["--cols" as any]: heat.hours.length }} onMouseLeave={() => setHeatHover(null)}
                      role="img" aria-label={`Check-in heatmap. Busiest slot ${heat.slots[0] ? `${heat.slots[0].day} ${String(heat.slots[0].h).padStart(2, "0")}:00 with ${heat.slots[0].v} check-ins` : "none"}. Switch to Table for the numbers.`}>
                      <span />
                      {heat.hours.map(h => <span key={h} className={styles.heatHour}>{h % 2 === 0 ? String(h).padStart(2, "0") : ""}</span>)}
                      {WEEKDAYS.map((d, di) => (
                        <React.Fragment key={d}>
                          <span className={styles.heatLabel}>{d}</span>
                          {heat.hours.map(h => {
                            const v = heat.grid[di][h];
                            const avg = heat.occurrences[di] ? v / heat.occurrences[di] : 0;
                            const text = `${d} ${String(h).padStart(2, "0")}:00 — ${v} check-in${v === 1 ? "" : "s"}${heat.occurrences[di] > 1 ? ` (avg ${avg.toFixed(1)} per ${d})` : ""}`;
                            return (
                              <span key={h} className={styles.heatCell} style={{ ["--cell" as any]: heatColor(v) }} onMouseEnter={() => setHeatHover(text)} />
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className={styles.panelHead} style={{ alignItems: "center" }}>
                    <div className={styles.heatReadout} aria-live="polite">
                      {heatHover ?? <>Busiest: <b>{heat.slots[0] ? `${heat.slots[0].day} ${String(heat.slots[0].h).padStart(2, "0")}:00` : "—"}</b> · busiest day <b>{[...heat.byDay].sort((a, b) => b.total - a.total)[0]?.day}</b> · peak hour <b>{String([...heat.byHour].sort((a, b) => b.total - a.total)[0]?.h ?? 0).padStart(2, "0")}:00</b></>}
                    </div>
                    <div className={styles.heatScale}>
                      <span>Fewer</span>
                      <span className={styles.heatRamp}><span style={{ ["--cell" as any]: "var(--heat-0)" }} />{palette.heat.map(c => <span key={c} style={{ ["--cell" as any]: c }} />)}</span>
                      <span>More (max {heat.max})</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.cols2}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Day</th><th className={styles.num}>Check-ins</th><th className={styles.num}>Avg per day</th></tr></thead>
                      <tbody>{heat.byDay.map(d => <tr key={d.day}><td>{d.day}</td><td className={styles.num}>{fmtInt(d.total)}</td><td className={styles.num}>{d.avg.toFixed(1)}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Busiest slots</th><th className={styles.num}>Check-ins</th></tr></thead>
                      <tbody>{heat.slots.slice(0, 7).map(s => <tr key={`${s.di}-${s.h}`}><td>{s.day} {String(s.h).padStart(2, "0")}:00</td><td className={styles.num}>{s.v}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>

          <div id="ca-pipeline" className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Renewals due" scope="Next 14 days" sub={roster.expiring.length ? `${roster.expiring.length} plans · about ${money(roster.expiringValue)}` : undefined} />
            {roster.expiring.length === 0 ? <div className={styles.empty}><CheckCircle2 size={22} />No plans end in the next 14 days.</div> : (
              <div className={styles.list} style={{ maxHeight: 320, overflowY: "auto" }}>
                {roster.expiring.slice(0, 25).map(e => (
                  <div key={e.m.id} className={styles.listRow}>
                    <span className={styles.avatar} data-tone={e.daysLeft <= 3 ? "red" : e.daysLeft <= 7 ? "amber" : "blue"}>{initials(e.m.name)}</span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowName}>{e.m.name}</span>
                      <span className={styles.rowMeta}>{planOf(e.m)} · ends {format(parseISO(e.end), "d MMM")}</span>
                    </div>
                    <div className={styles.rowEnd}>
                      <span className={styles.status} data-status={e.daysLeft <= 3 ? "critical" : e.daysLeft <= 7 ? "warning" : "info"}>
                        <Clock size={12} />{e.daysLeft === 0 ? "Today" : `${e.daysLeft}d`}
                      </span>
                      {onNavigate && <button type="button" className={styles.linkBtn} onClick={() => onNavigate("members", { tab: "renewals", memberId: e.m.id })}>Renew</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Growth + plan mix */}
        <div className={styles.row2}>
          <div id="ca-growth" className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Member growth" scope="Last 12 months" sub="New members vs plans that ended without renewal">
              <Seg label="Growth view" value={view("growth")} onChange={setView("growth")} options={VIEW_OPTIONS} />
            </PanelHead>
            {view("growth") === "chart" ? (
              <>
                <Legend items={[{ label: "Joined", color: palette.s1 }, { label: "Lapsed", color: palette.s2 }]} />
                <div className={styles.chartMd}>
                  <ResponsiveContainer>
                    <BarChart data={roster.growth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                      <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar dataKey="joins" name="Joined" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      <Bar dataKey="lapses" name="Lapsed" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Month</th><th className={styles.num}>Joined</th><th className={styles.num}>Lapsed</th><th className={styles.num}>Net</th></tr></thead>
                  <tbody>{roster.growth.map(g => <tr key={g.tipLabel}><td>{g.tipLabel}</td><td className={styles.num}>{g.joins}</td><td className={styles.num}>{g.lapses}</td><td className={styles.num}>{g.net > 0 ? `+${g.net}` : g.net}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>

          <div id="ca-plans" className={`${styles.card} ${styles.panel}`}>
            <PanelHead title="Active members by plan" scope="Now" sub={`${fmtInt(roster.active)} active members`} />
            <BarRows color={palette.s1} fmt={fmtInt} empty="No active members."
              rows={roster.planMix.map(([k, v]) => ({ key: k, label: k, value: v, meta: fmtShare(v, roster.active) }))} />
          </div>
        </div>

        {/* Deep dives */}
        <div id="ca-deep" style={{ display: "flex", flexDirection: "column", gap: "1rem", scrollMarginTop: "5rem" }}>
          <h2 className={styles.sectionTitle}><BarChart3 size={20} />Deep dives</h2>
          <Seg large label="Deep dive" value={deepTab} onChange={setDeepTab}
            options={[["risk", `Churn risk${roster.risk.length ? ` (${roster.risk.length})` : ""}`], ["team", "Team"], ["trainers", "Trainers"], ["community", "Community"], ["profit", "Profitability"]]} />

          {deepTab === "risk" && (
            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Members at risk of leaving" scope="Now"
                sub="Score from overdue balance, how long ago the plan ended and time since last payment. A rule, not a prediction model." />
              <div className={styles.riskCounts}>
                {(["High", "Medium", "Low"] as const).map(t => (
                  <div key={t} className={styles.riskCount}>
                    <span className={styles.status} data-status={t === "High" ? "critical" : t === "Medium" ? "warning" : "info"} style={{ alignSelf: "flex-start" }}>
                      {t === "High" ? <XCircle size={12} /> : t === "Medium" ? <AlertTriangle size={12} /> : <Info size={12} />}{t} risk
                    </span>
                    <span className={styles.riskCountValue}>{tierCounts[t]}</span>
                  </div>
                ))}
              </div>
              {roster.risk.length === 0 ? <div className={styles.empty}><CheckCircle2 size={22} />Nobody is overdue or recently lapsed.</div> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Member</th><th>Plan</th><th>Why</th><th className={styles.num}>Risk</th><th /></tr></thead>
                    <tbody>{roster.risk.slice(0, 15).map(r => (
                      <tr key={r.m.id}>
                        <td><div className={styles.rowName}>{r.m.name}</div><div className={styles.rowMeta}>{r.m.member_id ?? ""}{r.m.phone ? ` · ${r.m.phone}` : ""}</div></td>
                        <td className={styles.muted}>{planOf(r.m)}</td>
                        <td className={styles.muted}>{r.reasons.join(" · ")}</td>
                        <td className={styles.num}>
                          <span className={styles.miniTrack}><span className={styles.miniFill} style={{ display: "block", width: `${r.probability}%`, ["--fill" as any]: r.tier === "High" ? "var(--status-critical)" : r.tier === "Medium" ? "var(--status-warning)" : "var(--status-info)" }} /></span>
                          <span className={styles.status} data-status={r.tier === "High" ? "critical" : r.tier === "Medium" ? "warning" : "info"}>{r.probability}% · {r.tier}</span>
                        </td>
                        <td className={styles.num}>{onNavigate && <button type="button" className={styles.linkBtn} onClick={() => openMember(r.m)}>View</button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {roster.risk.length > 15 && <div className={styles.note} style={{ marginTop: "0.5rem" }}>Showing the 15 highest of {roster.risk.length}. Export for the full list.</div>}
                </div>
              )}
            </div>
          )}

          {deepTab === "team" && (
            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Collections by staff" sub={`Who processed each payment or POS sale in ${periodText}${preset === "this-month" ? " · target progress as shown in Target & Commission" : ""}`} />
              {stats.staffRows.length === 0 ? <div className={styles.empty}>No payments processed in this period.</div> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>#</th><th>Staff</th><th className={styles.num}>Payments</th><th className={styles.num}>Collections</th><th className={styles.num}>Share</th>{preset === "this-month" && <th>Monthly target</th>}</tr></thead>
                    <tbody>{stats.staffRows.map((s, i) => {
                      const pct = s.target && s.target.target > 0 ? s.target.percentage : null;
                      return (
                        <tr key={s.name}>
                          <td className={styles.muted}>{i + 1}</td>
                          <td><span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}><span className={styles.avatar} data-tone="teal" style={{ width: "1.75rem", height: "1.75rem" }}>{initials(s.name)}</span>{s.name}</span></td>
                          <td className={styles.num}>{fmtInt(s.count)}</td>
                          <td className={styles.num}><b>{money(s.value)}</b></td>
                          <td className={styles.num}>{fmtShare(s.value, stats.collections)}</td>
                          {preset === "this-month" && (
                            <td>{pct == null ? <span className={styles.muted}>No target</span> : (
                              <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
                                <span className={styles.miniTrack}><span className={styles.miniFill} style={{ display: "block", width: `${Math.min(100, pct)}%`, ["--fill" as any]: pct >= 100 ? "var(--status-good)" : palette.s1 }} /></span>
                                {fmtPct(pct, 0)} · {money(s.target!.achieved)} of {money(s.target!.target)}
                              </span>
                            )}</td>
                          )}
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {deepTab === "trainers" && (
            <div className={`${styles.card} ${styles.panel}`}>
              <PanelHead title="Trainer class bookings" scope="Last 30 days" sub="Bookings exclude cancellations and unapproved requests · show rate counts sessions already held · value is the booking price less refunds" />
              {trainers.length === 0 ? <div className={styles.empty}><Dumbbell size={22} />No class bookings in the last 30 days.</div> : (
                <div className={styles.cols2}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Trainer</th><th className={styles.num}>Bookings</th><th className={styles.num}>Checked in</th><th className={styles.num}>No-shows</th><th className={styles.num}>Show rate</th><th className={styles.num}>Cancelled</th><th className={styles.num}>Booked value</th></tr></thead>
                      <tbody>{trainers.map(t => (
                        <tr key={t.name}><td>{t.name}</td><td className={styles.num}>{t.bookings}</td><td className={styles.num}>{t.checkedIn}</td><td className={styles.num}>{t.noShow}</td><td className={styles.num} title={`${t.checkedIn} of ${t.held} held sessions`}>{fmtPct(t.showRate, 0)}</td><td className={styles.num}>{t.cancelled}</td><td className={styles.num}>{money(t.revenue)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className={styles.chartMd}>
                    <ResponsiveContainer>
                      <BarChart data={trainers.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid horizontal={false} stroke={palette.grid} />
                        <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={110} />
                        <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                        <Bar dataKey="bookings" name="Bookings" fill={palette.s1} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {deepTab === "community" && (() => {
            const c = base!.community;
            const weekly = (c?.weekly ?? []).map(w => ({ label: w.weekLabel, posts: w.posts, interactions: w.likes + w.comments }));
            const types = (c?.byType ?? []).map(t => ({ key: t.type, label: t.type.charAt(0).toUpperCase() + t.type.slice(1), value: t.posts, inter: t.likes + t.comments }));
            return (
              <div className={styles.row2}>
                <div className={`${styles.card} ${styles.panel}`}>
                  <PanelHead title="Community activity" scope={isAllBranches ? "Last 8 weeks" : "Last 8 weeks · gym-wide"} sub={c ? `${fmtInt(c.totalPosts)} posts · ${fmtInt(c.totalLikes)} likes · ${fmtInt(c.totalComments)} comments all-time` : undefined} />
                  {weekly.length === 0 ? <div className={styles.empty}><MessageSquare size={22} />No community posts yet.</div> : (
                    <div className={styles.cols2}>
                      {([["posts", "Posts per week", palette.s1], ["interactions", "Likes + comments per week", palette.s3]] as const).map(([key, title, color]) => (
                        <div key={key}>
                          <div className={styles.panelSub} style={{ marginBottom: "0.375rem" }}>{title}</div>
                          <div className={styles.chartSm}>
                            <ResponsiveContainer>
                              <BarChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke={palette.grid} />
                                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} interval="preserveStartEnd" />
                                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                                <Tooltip content={<ChartTip fmt={countTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                                <Bar dataKey={key} name={key === "posts" ? "Posts" : "Likes + comments"} fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`${styles.card} ${styles.panel}`}>
                  <PanelHead title="Posts by type" sub="Interactions per post shown alongside" />
                  <BarRows color={palette.s1} fmt={fmtInt} empty="No posts yet."
                    rows={types.sort((a, b) => b.value - a.value).map(t => ({ key: t.key, label: t.label, value: t.value, meta: `${(t.value ? t.inter / t.value : 0).toFixed(1)} per post` }))} />
                </div>
              </div>
            );
          })()}

          {deepTab === "profit" && (
            <div className={styles.row2}>
              <div className={`${styles.card} ${styles.panel}`}>
                <PanelHead title="Revenue, expenses and profit" scope={`Last ${Math.max(0, base!.monthly.length - 1)} months + this month`} sub="From posted ledger entries (same as the Income Statement)">
                  <Seg label="Profit view" value={view("profit")} onChange={setView("profit")} options={VIEW_OPTIONS} />
                </PanelHead>
                {base!.monthly.length === 0 ? <div className={styles.empty}><TrendingUp size={22} />No posted ledger entries yet.</div> : view("profit") === "chart" ? (
                  <>
                    <Legend items={[{ label: "Revenue", color: palette.s1 }, { label: "Expenses", color: palette.s2 }, { label: "Profit", color: palette.s3 }]} />
                    <div className={styles.chart}>
                      <ResponsiveContainer>
                        <BarChart data={base!.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
                          <CartesianGrid vertical={false} stroke={palette.grid} />
                          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
                          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={64} tickFormatter={v => compactMoney(Number(v))} />
                          <Tooltip content={<ChartTip fmt={moneyTip} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                          <Bar dataKey="revenue" name="Revenue" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                          <Bar dataKey="expenses" name="Expenses" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                          <Bar dataKey="profit" name="Profit" fill={palette.s3} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Month</th><th className={styles.num}>Revenue</th><th className={styles.num}>Expenses</th><th className={styles.num}>Profit</th><th className={styles.num}>Margin</th></tr></thead>
                      <tbody>{base!.monthly.map(m => (
                        <tr key={m.period || m.month}><td>{m.month}</td><td className={styles.num}>{money(m.revenue)}</td><td className={styles.num}>{money(m.expenses)}</td><td className={styles.num}>{money(m.profit)}</td><td className={styles.num}>{m.revenue ? fmtPct((m.profit / m.revenue) * 100) : "—"}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className={styles.stack}>
                <div className={`${styles.card} ${styles.panel}`}>
                  <PanelHead title="Ledger totals" scope="All time" />
                  {base!.ledger ? (
                    <div className={styles.facts}>
                      <div className={styles.fact}><span className={styles.factLabel}>Revenue</span><span className={styles.factValue}>{money(base!.ledger.revenue)}</span></div>
                      <div className={styles.fact}><span className={styles.factLabel}>Expenses</span><span className={styles.factValue}>{money(base!.ledger.expenses)}</span></div>
                      <div className={styles.fact}><span className={styles.factLabel}>Net profit</span><span className={styles.factValue}>{money(base!.ledger.profit)}</span></div>
                      <div className={styles.fact}><span className={styles.factLabel}>Margin</span><span className={styles.factValue}>{fmtPct(base!.ledger.margin)}</span></div>
                    </div>
                  ) : <div className={styles.empty}>Ledger totals are unavailable.</div>}
                  {onNavigate && <button type="button" className={styles.linkBtn} style={{ alignSelf: "flex-start" }} onClick={() => onNavigate("financial-analytics")}>Open Financial Analytics →</button>}
                </div>
                <div className={`${styles.card} ${styles.panel}`}>
                  <PanelHead title="Expenses by category" scope="All time" />
                  {(() => {
                    const total = base!.expenses.reduce((s, e) => s + (e.amount || 0), 0);
                    return <BarRows color={palette.s2} fmt={money} empty="No posted expenses yet."
                      rows={[...base!.expenses].sort((a, b) => b.amount - a.amount).slice(0, 6).map(e => ({ key: e.category, label: e.category, value: e.amount, meta: fmtPct(total ? (e.amount / total) * 100 : 0, 0) }))} />;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
