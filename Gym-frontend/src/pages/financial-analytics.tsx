import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays, differenceInCalendarDays, endOfMonth, endOfQuarter, endOfYear, format, isAfter, parseISO,
  startOfMonth, startOfQuarter, startOfYear, subDays, subMonths, subQuarters, subYears,
} from "date-fns";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Building2, CheckCircle2, CircleDollarSign, Download,
  Info, Landmark, Loader2, Minus, PiggyBank, Printer, Receipt, RefreshCw, Scale, Search, TrendingUp, Users,
  Wallet, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import {
  financialOverviewService, overviewErrorMessage,
  type AccountRow, type ActivityRow, type AgingRow, type CompareMode, type FinancialOverview, type Insight,
} from "../utils/supabase/financial-overview-service";
import styles from "../components/finance/financial-analytics.module.css";

// ── Periods ─────────────────────────────────────────────────────────────────

type Preset = "this-month" | "last-month" | "last-30" | "this-quarter" | "last-quarter" | "this-year" | "last-year" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-30", label: "Last 30 days" },
  { id: "this-quarter", label: "This quarter" },
  { id: "last-quarter", label: "Last quarter" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const minDate = (a: Date, b: Date) => (isAfter(a, b) ? b : a);

interface Ranges { from: Date; to: Date; compareFrom: Date; compareTo: Date }

/**
 * The selected range and what it's compared with. "Previous period" is the like-for-like
 * period before: month-to-date vs the same days of last month, a full month vs the month
 * before, a custom range vs the same number of days just before it.
 */
function computeRanges(preset: Preset, custom: { from: string; to: string }, compare: CompareMode): Ranges {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let from: Date, to: Date, compareFrom: Date, compareTo: Date;
  switch (preset) {
    case "this-month": {
      from = startOfMonth(today); to = today;
      const prev = subMonths(from, 1);
      compareFrom = prev; compareTo = minDate(addDays(prev, differenceInCalendarDays(to, from)), endOfMonth(prev));
      break;
    }
    case "last-month": {
      from = startOfMonth(subMonths(today, 1)); to = endOfMonth(from);
      compareFrom = startOfMonth(subMonths(from, 1)); compareTo = endOfMonth(compareFrom);
      break;
    }
    case "this-quarter": {
      from = startOfQuarter(today); to = today;
      const prev = subQuarters(from, 1);
      compareFrom = prev; compareTo = minDate(addDays(prev, differenceInCalendarDays(to, from)), endOfQuarter(prev));
      break;
    }
    case "last-quarter": {
      from = startOfQuarter(subQuarters(today, 1)); to = endOfQuarter(from);
      compareFrom = startOfQuarter(subQuarters(from, 1)); compareTo = endOfQuarter(compareFrom);
      break;
    }
    case "this-year": {
      from = startOfYear(today); to = today;
      compareFrom = subYears(from, 1); compareTo = subYears(to, 1);
      break;
    }
    case "last-year": {
      from = startOfYear(subYears(today, 1)); to = endOfYear(from);
      compareFrom = subYears(from, 1); compareTo = subYears(to, 1);
      break;
    }
    case "custom": {
      from = custom.from ? parseISO(custom.from) : startOfMonth(today);
      to = custom.to ? parseISO(custom.to) : today;
      if (isAfter(from, to)) [from, to] = [to, from];
      const days = differenceInCalendarDays(to, from) + 1;
      compareTo = subDays(from, 1); compareFrom = subDays(from, days);
      break;
    }
    default: {
      from = subDays(today, 29); to = today;
      compareTo = subDays(from, 1); compareFrom = subDays(from, 30);
    }
  }
  if (compare === "year") { compareFrom = subYears(from, 1); compareTo = subYears(to, 1); }
  return { from, to, compareFrom, compareTo };
}

const rangeLabel = (a: Date | string, b: Date | string) => {
  const x = typeof a === "string" ? parseISO(a) : a;
  const y = typeof b === "string" ? parseISO(b) : b;
  const sameYear = x.getFullYear() === y.getFullYear();
  return `${format(x, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(y, "d MMM yyyy")}`;
};

// ── Colors (validated dataviz slots; dark steps selected separately) ─────────

const LIGHT = { revenue: "#2a78d6", expenses: "#eb6834", profit: "#1baf7a", compare: "#a8a69f", grid: "#e9e8e3", axis: "#898781",
  ramp: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"] };
const DARK = { revenue: "#3987e5", expenses: "#d95926", profit: "#199e70", compare: "#6f6d67", grid: "#2c2c2a", axis: "#898781",
  ramp: ["#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"] };

/** Chart colors for the current theme (the app toggles a .dark class on <html>). */
function usePalette() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

// ── Small pieces ────────────────────────────────────────────────────────────

const fmtPct = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) ? "—" : `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
const compactNumber = (n: number) => Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Change vs the comparison period; `upIsGood` false for costs (expenses up = bad). */
function Delta({ pct, upIsGood = true, suffix = "%", points }: { pct: number | null | undefined; upIsGood?: boolean; suffix?: string; points?: boolean }) {
  if (pct == null || Number.isNaN(pct)) return <span className={styles.delta} data-tone="flat" title="Nothing to compare with in the comparison period"><Minus size={12} />no comparison</span>;
  if (Math.abs(pct) < 0.05) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0{points ? " pts" : suffix}</span>;
  const up = pct > 0;
  const good = up === upIsGood;
  return (
    <span className={styles.delta} data-tone={good ? "good" : "bad"} title={good ? "Better than the comparison" : "Worse than the comparison"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}{points ? " pts" : suffix}
    </span>
  );
}

type IconT = React.ComponentType<{ size?: number; className?: string }>;

function HeroKpi({ icon: Icon, tone, label, value, delta, previous, spark, sparkColor }: {
  icon: IconT; tone: string; label: string; value: string; delta: React.ReactNode; previous: string;
  spark?: number[]; sparkColor?: string;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
      </div>
      <div className={styles.kpiValue} title={value}>{value}</div>
      <div className={styles.kpiFoot}>{delta}<span>vs {previous}</span></div>
      {spark && spark.length > 1 && (
        <div className={styles.spark} aria-hidden>
          <ResponsiveContainer>
            <LineChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
              <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SmallKpi({ icon: Icon, tone, label, value, hint, delta }: {
  icon: IconT; tone: string; label: string; value: string; hint?: React.ReactNode; delta?: React.ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone} style={{ width: "1.75rem", height: "1.75rem" }}><Icon size={14} /></span>
      </div>
      <div className={styles.kpiValueSm} title={value}>{value}</div>
      {(delta || hint) && <div className={styles.kpiHint}>{delta}{delta && hint ? " · " : null}{hint}</div>}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className={styles.legend}>
      {items.map(i => (
        <span key={i.label} className={styles.legendItem}>
          <span className={i.line ? styles.swatchLine : styles.swatch} style={{ ["--sw" as any]: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function ChartTip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipKey}>
            <span className={styles.swatch} style={{ ["--sw" as any]: p.color || p.stroke || p.fill }} />{p.name}
          </span>
          <span className={styles.tooltipVal}>{p.unit === "%" ? fmtPct(p.value) : money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className={styles.seg} role="tablist">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={styles.segBtn} data-active={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function BarRows({ rows, color, money, upIsGood, empty }: {
  rows: AccountRow[]; color: string; money: (n: number) => string; upIsGood: boolean; empty: string;
}) {
  if (!rows.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(...rows.map(r => Math.abs(r.current)), 1);
  return (
    <div className={styles.barRows}>
      {rows.map(r => (
        <div key={r.code} className={styles.barRow}>
          <span className={styles.barName} title={`${r.code} · ${r.name}`}>{r.name}</span>
          <span className={styles.barVal}>{money(r.current)}</span>
          <div className={styles.barTrack}>
            <div className={styles.track}><div className={styles.fill} style={{ width: `${(Math.max(r.current, 0) / max) * 100}%`, ["--fill" as any]: color }} /></div>
            <span className={styles.barMeta}>{fmtPct(r.share)} · <Delta pct={r.changePct} upIsGood={upIsGood} /></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Aging({ rows, ramp, money, emptyText }: { rows: AgingRow[]; ramp: string[]; money: (n: number) => string; emptyText: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total <= 0) return <div className={styles.empty}><CheckCircle2 size={22} />{emptyText}</div>;
  return (
    <>
      <div className={styles.agingBar} role="img" aria-label="Ageing breakdown">
        {rows.map((r, i) => r.amount > 0 && (
          <div key={r.bucket} className={styles.agingSeg} title={`${r.label}: ${money(r.amount)}`}
            style={{ width: `${(r.amount / total) * 100}%`, ["--fill" as any]: ramp[i] }} />
        ))}
      </div>
      <div className={styles.agingLegend}>
        {rows.map((r, i) => (
          <div key={r.bucket} className={styles.agingCell}>
            <span className={styles.legendItem} style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
              <span className={styles.swatch} style={{ ["--sw" as any]: ramp[i] }} />{r.label}
            </span>
            <span className={styles.barVal}>{money(r.amount)}</span>
            <span className={styles.kpiHint}>{r.count} {r.count === 1 ? "bill" : "bills"}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const INSIGHT_META: Record<Insight["type"], { label: string; icon: IconT }> = {
  positive: { label: "Good", icon: CheckCircle2 },
  info: { label: "Note", icon: Info },
  warning: { label: "Watch", icon: AlertTriangle },
  critical: { label: "Act now", icon: XCircle },
};

const KIND_LABEL: Record<ActivityRow["kind"], string> = {
  income: "Income", expense: "Expense", income_reversal: "Income reversal", expense_reversal: "Expense reversal",
};

// ── Page ────────────────────────────────────────────────────────────────────

export function FinancialAnalytics() {
  const { formatCurrency, currencyCode } = useCurrency();
  const { activeBranchId, activeBranchName, isAllBranches } = useBranch();
  const palette = usePalette();

  const [preset, setPreset] = useState<Preset>("this-month");
  const [custom, setCustom] = useState({ from: ymd(startOfMonth(new Date())), to: ymd(new Date()) });
  const [compare, setCompare] = useState<CompareMode>("previous");
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trendView, setTrendView] = useState<"pl" | "compare" | "cash" | "table">("pl");
  const [monthlyView, setMonthlyView] = useState<"chart" | "table">("chart");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "income" | "expense">("all");
  const [showAll, setShowAll] = useState(false);

  const ranges = useMemo(() => computeRanges(preset, custom, compare), [preset, custom, compare]);

  const money = useCallback((n: number | null | undefined) =>
    n == null ? "—" : formatCurrency(Number(n), { maximumFractionDigits: 0 }), [formatCurrency]);
  const money2 = useCallback((n: number | null | undefined) =>
    n == null ? "—" : formatCurrency(Number(n), { maximumFractionDigits: 2 }), [formatCurrency]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await financialOverviewService.get({
        from: ymd(ranges.from), to: ymd(ranges.to), compare,
        compareFrom: ymd(ranges.compareFrom), compareTo: ymd(ranges.compareTo),
      }));
    } catch (err) {
      setError(overviewErrorMessage(err, "Couldn't load financial analytics"));
    } finally {
      setLoading(false);
    }
  }, [ranges, compare]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const k = data?.kpis;
  const trend = data?.trend ?? [];
  const compareText = data ? rangeLabel(data.comparePeriod.from, data.comparePeriod.to) : rangeLabel(ranges.compareFrom, ranges.compareTo);
  const granularityLabel = data?.period.granularity === "day" ? "Daily" : data?.period.granularity === "week" ? "Weekly" : "Monthly";

  const activity = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.activity ?? []).filter(a =>
      (kind === "all" || a.kind.startsWith(kind))
      && (!q || [a.voucherNo, a.narration, a.reference, a.accounts].some(s => (s ?? "").toLowerCase().includes(q))));
  }, [data, search, kind]);

  // ── Export ──────────────────────────────────────────────────────────────
  const periodTitle = `${rangeLabel(ranges.from, ranges.to)} (vs ${compareText})`;
  const branchTitle = isAllBranches ? "All branches" : activeBranchName;

  const exportCsv = () => {
    if (!data || !k) return;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: unknown[][] = [
      ["Financial Analytics", branchTitle], ["Period", periodTitle], ["Currency", currencyCode], [],
      ["Metric", "This period", "Comparison", "Change %"],
      ["Revenue", k.revenue.current, k.revenue.previous, k.revenue.changePct],
      ["Expenses", k.expenses.current, k.expenses.previous, k.expenses.changePct],
      ["Net profit", k.netProfit.current, k.netProfit.previous, k.netProfit.changePct],
      ["Profit margin %", k.profitMargin.current, k.profitMargin.previous, k.profitMargin.change],
      ["Cash in", k.cashIn.current, k.cashIn.previous, k.cashIn.changePct],
      ["Cash out", k.cashOut.current, k.cashOut.previous, k.cashOut.changePct],
      ["Collections", k.collections.current, k.collections.previous, k.collections.changePct],
      ["Member dues outstanding", k.receivables.amount], ["Supplier bills outstanding", k.payables.amount],
      ["Tax payable", k.taxPayable], ["Cash & bank balance", k.cashBalance], [],
      ["Trend", "Revenue", "Expenses", "Profit", "Cash in", "Cash out", "Comparison revenue"],
      ...data.trend.map(t => [t.label, t.revenue, t.expenses, t.profit, t.cashIn, t.cashOut, t.previousRevenue]), [],
      ["Revenue account", "This period", "Comparison", "Share %", "Change %"],
      ...data.revenueByAccount.map(r => [r.name, r.current, r.previous, r.share, r.changePct]), [],
      ["Expense account", "This period", "Comparison", "Share %", "Change %"],
      ...data.expenseByAccount.map(r => [r.name, r.current, r.previous, r.share, r.changePct]), [],
      ["Payment method", "Amount", "Payments", "Share %"],
      ...data.collectionsByMethod.map(m => [m.method, m.amount, m.count, m.share]), [],
      ["Member dues ageing", "Amount", "Bills"], ...data.receivablesAging.map(a => [a.label, a.amount, a.count]), [],
      ["Supplier bills ageing", "Amount", "Bills"], ...data.payablesAging.map(a => [a.label, a.amount, a.count]), [],
      ["Date", "Voucher", "Type", "Amount", "Accounts", "Narration"],
      ...data.activity.map(a => [a.date, a.voucherNo, KIND_LABEL[a.kind], a.amount, a.accounts, a.narration]),
    ];
    const csv = rows.map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-analytics_${ymd(ranges.from)}_${ymd(ranges.to)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported — opens in Excel");
  };

  const printReport = () => {
    if (!data || !k) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow pop-ups to print the report");
    const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const table = (head: string[], body: unknown[][]) =>
      `<table><thead><tr>${head.map(h => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map((c, i) => `<td class="${i ? "n" : ""}">${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n}%`);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Financial Analytics</title><style>
      body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0b0b0b;margin:32px;font-size:12px}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:24px 0 8px}.sub{color:#52514e;margin:4px 0 16px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{padding:6px 8px;border-bottom:1px solid #e1e0d9;text-align:left}
      th{color:#52514e;font-weight:600}td.n{text-align:right;font-variant-numeric:tabular-nums}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}li{margin:4px 0}</style></head><body>
      <h1>Financial Analytics — ${e(branchTitle)}</h1><div class="sub">${e(periodTitle)} · generated ${e(format(new Date(), "d MMM yyyy, HH:mm"))}</div>
      <h2>Summary</h2>${table(["Metric", "This period", "Comparison", "Change"], [
        ["Revenue", money(k.revenue.current), money(k.revenue.previous), pct(k.revenue.changePct)],
        ["Expenses", money(k.expenses.current), money(k.expenses.previous), pct(k.expenses.changePct)],
        ["Net profit", money(k.netProfit.current), money(k.netProfit.previous), pct(k.netProfit.changePct)],
        ["Profit margin", fmtPct(k.profitMargin.current), fmtPct(k.profitMargin.previous), `${k.profitMargin.change} pts`],
        ["Cash in / out", `${money(k.cashIn.current)} / ${money(k.cashOut.current)}`, `${money(k.cashIn.previous)} / ${money(k.cashOut.previous)}`, ""],
        ["Collections", money(k.collections.current), money(k.collections.previous), pct(k.collections.changePct)],
        ["Member dues", money(k.receivables.amount), "", `${k.receivables.members} members`],
        ["Supplier bills due", money(k.payables.amount), "", `${k.payables.bills} bills`],
        ["Tax payable", money(k.taxPayable), "", ""],
      ])}
      <h2>Insights</h2><ul>${data.insights.map(i => `<li><b>${e(i.title)}</b> — ${e(i.detail)}</li>`).join("")}</ul>
      <div class="grid"><div><h2>Revenue by account</h2>${table(["Account", "Amount", "Share", "Change"], data.revenueByAccount.map(r => [r.name, money(r.current), fmtPct(r.share), pct(r.changePct)]))}</div>
      <div><h2>Expenses by account</h2>${table(["Account", "Amount", "Share", "Change"], data.expenseByAccount.map(r => [r.name, money(r.current), fmtPct(r.share), pct(r.changePct)]))}</div></div>
      <h2>${e(granularityLabel)} trend</h2>${table(["Period", "Revenue", "Expenses", "Profit", "Cash in", "Cash out"], data.trend.map(t => [t.label, money(t.revenue), money(t.expenses), money(t.profit), money(t.cashIn), money(t.cashOut)]))}
      <h2>Last 12 months</h2>${table(["Month", "Revenue", "Expenses", "Profit", "Margin"], data.monthly.map(m => [m.label, money(m.revenue), money(m.expenses), money(m.profit), fmtPct(m.margin)]))}
      <div class="grid"><div><h2>Collections by payment method</h2>${table(["Method", "Amount", "Payments", "Share"], data.collectionsByMethod.map(m => [m.method, money(m.amount), m.count, fmtPct(m.share)]))}</div>
      <div><h2>Member dues ageing</h2>${table(["Age", "Amount", "Bills"], data.receivablesAging.map(a => [a.label, money(a.amount), a.count]))}</div></div>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const sparkOf = (key: "revenue" | "expenses" | "profit") => trend.map(t => Number(t[key]) || 0);
  const axisTick = { fontSize: 11, fill: palette.axis };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Financial Analytics</h1>
          <div className={styles.subtitle}>
            <span className={styles.branchChip}><Building2 size={13} />{branchTitle}</span>
            <span>{rangeLabel(ranges.from, ranges.to)}</span>
            <span>·</span>
            <span>compared with {compareText}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!data}><Download className="mr-2 h-4 w-4" /> Excel (CSV)</Button>
          <Button onClick={printReport} disabled={!data}><Printer className="mr-2 h-4 w-4" /> Print / PDF</Button>
        </div>
      </div>

      {/* One filter row scopes every chart */}
      <div className={`${styles.card} ${styles.filters}`}>
        <div className={styles.chips}>
          {PRESETS.map(p => (
            <button key={p.id} type="button" className={styles.chip} data-active={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className={styles.customRange}>
            <Input type="date" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} aria-label="From" />
            <span className={styles.filterLabel}>to</span>
            <Input type="date" value={custom.to} min={custom.from} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} aria-label="To" />
          </div>
        )}
        <div className={styles.filterEnd}>
          <span className={styles.filterLabel}>Compare with</span>
          <Select value={compare} onValueChange={v => setCompare(v as CompareMode)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="previous">Previous period</SelectItem>
              <SelectItem value="year">Same period last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && !data ? (
        <div className={`${styles.card} ${styles.errorBox}`}>{error}</div>
      ) : !data || !k ? (
        <div className={styles.centered}><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && <div className={`${styles.card} ${styles.errorBox}`}>{error}</div>}

          {/* Profit & loss */}
          <div className={styles.heroKpis}>
            <HeroKpi icon={TrendingUp} tone="blue" label="Revenue" value={money(k.revenue.current)}
              delta={<Delta pct={k.revenue.changePct} />} previous={money(k.revenue.previous)}
              spark={sparkOf("revenue")} sparkColor={palette.revenue} />
            <HeroKpi icon={Receipt} tone="orange" label="Expenses" value={money(k.expenses.current)}
              delta={<Delta pct={k.expenses.changePct} upIsGood={false} />} previous={money(k.expenses.previous)}
              spark={sparkOf("expenses")} sparkColor={palette.expenses} />
            <HeroKpi icon={PiggyBank} tone={k.netProfit.current >= 0 ? "green" : "red"} label="Net profit" value={money(k.netProfit.current)}
              delta={<Delta pct={k.netProfit.changePct} />} previous={money(k.netProfit.previous)}
              spark={sparkOf("profit")} sparkColor={palette.profit} />
            <HeroKpi icon={Scale} tone="teal" label="Profit margin" value={fmtPct(k.profitMargin.current)}
              delta={<Delta pct={k.profitMargin.change} points />} previous={fmtPct(k.profitMargin.previous)} />
          </div>

          {/* Cash & position */}
          <div className={styles.kpis}>
            <SmallKpi icon={Wallet} tone="violet" label="Collections" value={money(k.collections.current)}
              delta={<Delta pct={k.collections.changePct} />} hint={`${k.payingMembers.current} paying members`} />
            <SmallKpi icon={Banknote} tone={k.netCashFlow.current >= 0 ? "green" : "red"} label="Net cash flow" value={money(k.netCashFlow.current)}
              hint={`In ${money(k.cashIn.current)} · out ${money(k.cashOut.current)}`} />
            <SmallKpi icon={Landmark} tone="blue" label="Cash & bank" value={money(k.cashBalance)}
              hint={`Balance on ${format(ranges.to, "d MMM")}${k.openReconciliations ? ` · ${k.openReconciliations} unreconciled` : ""}`} />
            <SmallKpi icon={Users} tone={k.receivables.overdue > 0 ? "amber" : "gray"} label="Member dues" value={money(k.receivables.amount)}
              hint={`${k.receivables.members} ${k.receivables.members === 1 ? "member" : "members"}${k.receivables.overdue > 0 ? ` · ${money(k.receivables.overdue)} overdue` : ""}`} />
            <SmallKpi icon={Receipt} tone={k.payables.overdue > 0 ? "red" : "gray"} label="Supplier bills due" value={money(k.payables.amount)}
              hint={`${k.payables.bills} ${k.payables.bills === 1 ? "bill" : "bills"}${k.payables.overdue > 0 ? ` · ${money(k.payables.overdue)} overdue` : ""}`} />
            <SmallKpi icon={CircleDollarSign} tone="gray" label="Tax payable" value={money(k.taxPayable)}
              hint={k.deferredRevenue > 0 ? `${money(k.deferredRevenue)} deferred revenue` : "Net of input credit"} />
          </div>

          {/* Trend + insights */}
          <div className={styles.row2}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>{granularityLabel} performance</h3>
                  <div className={styles.panelSub}>
                    {trendView === "compare" ? `Revenue this period vs ${compareText}` : trendView === "cash" ? "Money into and out of cash & bank accounts" : "Revenue, expenses and profit from posted entries"}
                  </div>
                </div>
                <Seg value={trendView} onChange={setTrendView}
                  options={[["pl", "Profit & loss"], ["compare", "vs comparison"], ["cash", "Cash flow"], ["table", "Table"]]} />
              </div>
              {trendView === "table" ? (
                <div className={styles.tableWrap} style={{ maxHeight: 340, overflowY: "auto" }}>
                  <table className={styles.table}>
                    <thead><tr><th>Period</th><th className={styles.num}>Revenue</th><th className={styles.num}>Expenses</th><th className={styles.num}>Profit</th><th className={styles.num}>Cash in</th><th className={styles.num}>Cash out</th><th className={styles.num}>Comparison revenue</th></tr></thead>
                    <tbody>
                      {trend.map(t => (
                        <tr key={t.start}>
                          <td>{t.label}</td><td className={styles.num}>{money(t.revenue)}</td><td className={styles.num}>{money(t.expenses)}</td>
                          <td className={styles.num}>{money(t.profit)}</td><td className={styles.num}>{money(t.cashIn)}</td><td className={styles.num}>{money(t.cashOut)}</td>
                          <td className={styles.num}>{money(t.previousRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td>Total</td><td className={styles.num}>{money(k.revenue.current)}</td><td className={styles.num}>{money(k.expenses.current)}</td><td className={styles.num}>{money(k.netProfit.current)}</td><td className={styles.num}>{money(k.cashIn.current)}</td><td className={styles.num}>{money(k.cashOut.current)}</td><td className={styles.num}>{money(k.revenue.previous)}</td></tr></tfoot>
                  </table>
                </div>
              ) : (
                <>
                  <Legend items={trendView === "pl"
                    ? [{ label: "Revenue", color: palette.revenue }, { label: "Expenses", color: palette.expenses }, { label: "Profit", color: palette.profit, line: true }]
                    : trendView === "compare"
                      ? [{ label: "This period", color: palette.revenue }, { label: `Comparison (${compareText})`, color: palette.compare }]
                      : [{ label: "Cash in", color: palette.profit }, { label: "Cash out", color: palette.expenses }]} />
                  <div className={styles.chartFill}>
                    <ResponsiveContainer>
                      <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
                        <CartesianGrid stroke={palette.grid} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} minTickGap={12} />
                        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
                        <Tooltip content={<ChartTip money={money2} />} cursor={{ fill: "color-mix(in srgb, currentColor 6%, transparent)" }} />
                        {trendView === "pl" && <>
                          <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill={palette.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill={palette.expenses} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Line isAnimationActive={false} dataKey="profit" name="Profit" type="monotone" stroke={palette.profit} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </>}
                        {trendView === "compare" && <>
                          <Bar isAnimationActive={false} dataKey="previousRevenue" name="Comparison" fill={palette.compare} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar isAnimationActive={false} dataKey="revenue" name="This period" fill={palette.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>}
                        {trendView === "cash" && <>
                          <Bar isAnimationActive={false} dataKey="cashIn" name="Cash in" fill={palette.profit} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar isAnimationActive={false} dataKey="cashOut" name="Cash out" fill={palette.expenses} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <div>
                <h3 className={styles.panelTitle}>Insights</h3>
                <div className={styles.panelSub}>Worked out from this period's figures</div>
              </div>
              <div className={styles.insights}>
                {data.insights.length === 0 ? <div className={styles.empty}>Nothing stands out for this period.</div>
                  : data.insights.map((i, idx) => {
                    const meta = INSIGHT_META[i.type] ?? INSIGHT_META.info;
                    return (
                      <div key={idx} className={styles.insight} data-type={i.type}>
                        <span className={styles.insightIcon}><meta.icon size={15} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.insightTag}>{meta.label}</div>
                          <div className={styles.insightTitle}>{i.title}</div>
                          <div className={styles.insightDetail}>{i.detail}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Revenue streams & expenses */}
          <div className={styles.cols2}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Revenue streams</h3>
                  <div className={styles.panelSub}>By income account · share · change vs comparison</div>
                </div>
                <span className={styles.barVal}>{money(k.revenue.current)}</span>
              </div>
              <BarRows rows={data.revenueByAccount} color={palette.revenue} money={money} upIsGood empty="No income posted in this period." />
            </div>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Where the money went</h3>
                  <div className={styles.panelSub}>By expense account · share · change vs comparison</div>
                </div>
                <span className={styles.barVal}>{money(k.expenses.current)}</span>
              </div>
              <BarRows rows={data.expenseByAccount} color={palette.expenses} money={money} upIsGood={false} empty="No expenses posted in this period." />
            </div>
          </div>

          {/* 12 months */}
          <div className={`${styles.card} ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h3 className={styles.panelTitle}>Last 12 months</h3>
                <div className={styles.panelSub}>Up to {format(ranges.to, "MMMM yyyy")}, regardless of the period picked above</div>
              </div>
              <Seg value={monthlyView} onChange={setMonthlyView} options={[["chart", "Chart"], ["table", "Table"]]} />
            </div>
            {monthlyView === "table" ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Month</th><th className={styles.num}>Revenue</th><th className={styles.num}>Expenses</th><th className={styles.num}>Profit</th><th className={styles.num}>Margin</th></tr></thead>
                  <tbody>
                    {data.monthly.map(m => (
                      <tr key={m.month}><td>{m.label}</td><td className={styles.num}>{money(m.revenue)}</td><td className={styles.num}>{money(m.expenses)}</td><td className={styles.num}>{money(m.profit)}</td><td className={styles.num}>{fmtPct(m.margin)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <Legend items={[{ label: "Revenue", color: palette.revenue }, { label: "Expenses", color: palette.expenses }]} />
                <div className={styles.chart} style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
                      <CartesianGrid stroke={palette.grid} vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={(l: string) => l.slice(0, 3)} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
                      <Tooltip content={<ChartTip money={money2} />} cursor={{ fill: "color-mix(in srgb, currentColor 6%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill={palette.revenue} radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill={palette.expenses} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Margin on its own axis — never a second y-scale on the chart above. */}
                <div className={styles.panelSub} style={{ marginTop: 4 }}>Profit margin %</div>
                <div className={styles.chartSm}>
                  <ResponsiveContainer>
                    <LineChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={palette.grid} vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={(l: string) => l.slice(0, 3)} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={48} />
                      <Tooltip content={<ChartTip money={money2} />} />
                      <Line isAnimationActive={false} dataKey="margin" name="Margin" unit="%" type="monotone" stroke={palette.profit} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Collections & branches */}
          <div className={styles.cols2}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Collections by payment method</h3>
                  <div className={styles.panelSub}>Membership receipts and POS sales received in this period</div>
                </div>
                <span className={styles.barVal}>{money(k.collections.current)}</span>
              </div>
              <div className={styles.block} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {data.collectionsBySource.map(s => (
                  <div key={s.label}>
                    <div className={styles.kpiHint}>{s.label}</div>
                    <div className={styles.barVal} style={{ textAlign: "left" }}>{money(s.current)}</div>
                    <Delta pct={s.changePct} />
                  </div>
                ))}
                <div>
                  <div className={styles.kpiHint}>Avg membership payment</div>
                  <div className={styles.barVal} style={{ textAlign: "left" }}>{money(k.avgReceipt.current)}</div>
                  <Delta pct={k.avgReceipt.changePct} />
                </div>
              </div>
              {data.collectionsByMethod.length === 0 ? <div className={styles.empty}>No payments received in this period.</div> : (
                <div className={styles.barRows}>
                  {data.collectionsByMethod.map(m => (
                    <div key={m.method} className={styles.barRow}>
                      <span className={styles.barName}>{m.method}</span>
                      <span className={styles.barVal}>{money(m.amount)}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.track}><div className={styles.fill} style={{ width: `${m.share}%`, ["--fill" as any]: palette.revenue }} /></div>
                        <span className={styles.barMeta}>{fmtPct(m.share)} · {m.count} {m.count === 1 ? "payment" : "payments"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              {data.branches.length > 0 ? (
                <>
                  <div>
                    <h3 className={styles.panelTitle}>Branch comparison</h3>
                    <div className={styles.panelSub}>Profit & loss per branch in this period</div>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Branch</th><th className={styles.num}>Revenue</th><th className={styles.num}>Expenses</th><th className={styles.num}>Profit</th><th className={styles.num}>Margin</th><th className={styles.num}>Revenue change</th></tr></thead>
                      <tbody>
                        {data.branches.map(b => (
                          <tr key={b.branchId}>
                            <td><div className="font-medium">{b.name}</div><div className={styles.kpiHint}>{fmtPct(b.revenueShare)} of revenue</div></td>
                            <td className={styles.num}>{money(b.revenue)}</td><td className={styles.num}>{money(b.expenses)}</td>
                            <td className={styles.num} style={{ color: b.profit < 0 ? "var(--bad-ink)" : undefined }}>{money(b.profit)}</td>
                            <td className={styles.num}>{fmtPct(b.margin)}</td><td className={styles.num}><Delta pct={b.revenueChangePct} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className={styles.panelTitle}>Daily averages</h3>
                    <div className={styles.panelSub}>Per day over {data.period.days} {data.period.days === 1 ? "day" : "days"}{!isAllBranches && " · switch to All Branches in the sidebar to compare branches"}</div>
                  </div>
                  <div className={styles.block} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                    <div><div className={styles.kpiHint}>Revenue per day</div><div className={styles.kpiValueSm}>{money(k.avgDailyRevenue.current)}</div><Delta pct={k.avgDailyRevenue.changePct} /></div>
                    <div><div className={styles.kpiHint}>Expenses per day</div><div className={styles.kpiValueSm}>{money(k.expenses.current / Math.max(1, data.period.days))}</div></div>
                    <div><div className={styles.kpiHint}>Paying members</div><div className={styles.kpiValueSm}>{k.payingMembers.current}</div><Delta pct={k.payingMembers.changePct} /></div>
                    <div><div className={styles.kpiHint}>Revenue per paying member</div><div className={styles.kpiValueSm}>{k.payingMembers.current > 0 ? money(k.revenue.current / k.payingMembers.current) : "—"}</div></div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dues & bills */}
          <div className={styles.cols2}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Member dues ageing</h3>
                  <div className={styles.panelSub}>Open membership bills by how long they're past due (today)</div>
                </div>
                <span className={styles.barVal}>{money(k.receivables.amount)}</span>
              </div>
              <Aging rows={data.receivablesAging} ramp={palette.ramp} money={money} emptyText="No member owes anything right now." />
              {data.topDebtors.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Member</th><th className={styles.num}>Owes</th><th>Oldest due</th></tr></thead>
                    <tbody>
                      {data.topDebtors.map((d, i) => (
                        <tr key={i}>
                          <td>{d.name}</td><td className={styles.num}>{money(d.amount)}</td>
                          <td>{format(parseISO(d.oldestDue), "d MMM yyyy")}{d.daysOverdue > 0 && <span className={styles.pill} data-tone="amber" style={{ marginLeft: 8 }}>{d.daysOverdue}d late</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Supplier bills ageing</h3>
                  <div className={styles.panelSub}>Unpaid purchase bills by days past due (today)</div>
                </div>
                <span className={styles.barVal}>{money(k.payables.amount)}</span>
              </div>
              <Aging rows={data.payablesAging} ramp={palette.ramp} money={money} emptyText="No unpaid supplier bills." />
              {data.upcomingPayables.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Supplier</th><th>Bill</th><th className={styles.num}>Due</th><th>Due date</th></tr></thead>
                    <tbody>
                      {data.upcomingPayables.map((p, i) => (
                        <tr key={i}>
                          <td>{p.vendor || "—"}</td><td className={styles.muted}>{p.bill || "—"}</td><td className={styles.num}>{money(p.amount)}</td>
                          <td>{format(parseISO(p.dueDate), "d MMM yyyy")}{p.daysOverdue > 0 && <span className={styles.pill} data-tone="red" style={{ marginLeft: 8 }}>{p.daysOverdue}d overdue</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className={`${styles.card} ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h3 className={styles.panelTitle}>Income & expense entries</h3>
                <div className={styles.panelSub}>Posted vouchers in this period that hit income or expense accounts</div>
              </div>
              <div className={styles.toolbar}>
                <Seg value={kind} onChange={v => { setKind(v); setShowAll(false); }} options={[["all", "All"], ["income", "Income"], ["expense", "Expenses"]]} />
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <Input placeholder="Search voucher, account, narration…" value={search} onChange={e => { setSearch(e.target.value); setShowAll(false); }} style={{ paddingLeft: 30 }} />
                </div>
              </div>
            </div>
            {activity.length === 0 ? <div className={styles.empty}>No entries match.</div> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Accounts</th><th>Narration</th><th className={styles.num}>Amount</th></tr></thead>
                  <tbody>
                    {(showAll ? activity : activity.slice(0, 15)).map(a => (
                      <tr key={a.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{format(parseISO(a.date), "d MMM yyyy")}</td>
                        <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{a.voucherNo || "—"}</td>
                        <td><span className={styles.pill} data-tone={a.kind.startsWith("income") ? "blue" : "orange"}>{KIND_LABEL[a.kind]}</span></td>
                        <td className={styles.truncate} title={a.accounts}>{a.accounts}</td>
                        <td className={`${styles.truncate} ${styles.muted}`} title={a.narration}>{a.narration || "—"}</td>
                        <td className={styles.num}>{money2(a.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activity.length > 15 && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
                    <Button variant="outline" size="sm" onClick={() => setShowAll(s => !s)}>
                      {showAll ? "Show less" : `Show all ${activity.length}`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
