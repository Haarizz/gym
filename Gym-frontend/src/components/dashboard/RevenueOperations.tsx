import React, { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  CalendarCheck, ChevronRight, Download, Info, LayoutGrid, Loader2, Megaphone, RefreshCw,
  ShoppingCart, Snowflake, Target, UserPlus, Users, Wallet,
} from "lucide-react";
import { Button } from "../ui/button";
import { CurrencyGlyph } from "../../utils/currency";
import {
  dashboardService,
  type OperationsComparison,
  type OpsArea,
  type OpsFormat,
  type OpsMetric,
  type OpsRow,
  type OpsTrendKey,
  type OpsTrendPoint,
  type RevenueCompareMode,
  type RevenueGranularity,
  type RevenueSummary,
  type StaffTargetCompareRow,
  type TargetTotals,
  type TargetsComparison,
} from "../../utils/supabase/dashboard-service";
import { ChangeBadge, RevenueComparisonTab, formatRange, pctChange } from "./RevenueReports";
import rs from "./RevenueReports.module.css";
import { ReportActions, type ReportDocument, type ValueFormat, chartFromRows, col, tableSection } from "../report-export";
import styles from "./RevenueOperations.module.css";

// Current period in the theme colour, comparison period in neutral grey (same as the revenue charts)
const CURRENT_COLOR = "var(--gb-primary-deep)";
const COMPARE_COLOR = "#94A3B8";
const GOOD_COLOR = "#1baf7a";
const BAD_COLOR = "#e34948";
const TARGET_COLOR = "#eb6834";

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function Money({ value, digits = 2 }: { value: unknown; digits?: number }) {
  return (
    <span className={rs.money}>
      <CurrencyGlyph />
      {num(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}
    </span>
  );
}

/** A metric value in its unit; null = not measurable (e.g. a rate with nothing to measure). */
function formatValue(v: number | null | undefined, format: OpsFormat): React.ReactNode {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  switch (format) {
    case "money": return <Money value={v} />;
    case "percent": return `${v.toFixed(1)}%`;
    case "days": return `${v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 1 : 0 })} day${Math.round(v * 10) === 10 ? "" : "s"}`;
    case "hours": return v < 1 ? `${Math.round(v * 60)} min` : `${v.toFixed(1)} h`;
    case "minutes": return `${Math.round(v)} min`;
    case "decimal": return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    default: return Math.round(v).toLocaleString();
  }
}

function formatPlain(v: number | null, format: OpsFormat) {
  if (v === null || !Number.isFinite(v)) return "";
  if (format === "money") return v.toFixed(2);
  if (format === "count") return String(Math.round(v));
  return v.toFixed(1);
}

/** Rates move in percentage points; everything else in % change. */
function MetricChange({ m }: { m: Pick<OpsMetric, "current" | "previous" | "format" | "goodWhenUp"> }) {
  // Nothing to compare when either side isn't measurable
  if (m.current === null || m.previous === null) return <span className={`${styles.pts} ${styles.ptsFlat}`}>—</span>;
  if (m.format === "percent") {
    const diff = num(m.current) - num(m.previous);
    if (Math.abs(diff) < 0.05) return <span className={`${styles.pts} ${styles.ptsFlat}`}>±0 pts</span>;
    const good = diff > 0 === m.goodWhenUp;
    return (
      <span className={`${styles.pts} ${good ? styles.ptsUp : styles.ptsDown}`}>
        {diff > 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)} pts
      </span>
    );
  }
  return <ChangeBadge current={num(m.current)} previous={num(m.previous)} goodWhenUp={m.goodWhenUp} />;
}

// ── Chart tooltip ───────────────────────────────────────────────────────────

const ValueTooltip = ({ active, payload, label, format = "count", suffix }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={rs.tooltip}>
      <p className={rs.tooltipTitle}>{label ?? payload[0]?.payload?.name}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value === null || p.value === undefined ? "—" : formatValue(num(p.value), format)}{suffix ?? ""}
        </p>
      ))}
    </div>
  );
};

// ── Building blocks ─────────────────────────────────────────────────────────

function Panel({ title, description, actions, children }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className={rs.panel}>
      <div className={styles.panelHeadRow}>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Metric tiles: value, change badge, comparison value. */
function MetricTiles({ metrics, compareLabel }: { metrics: OpsMetric[]; compareLabel: string }) {
  return (
    <div className={rs.tiles}>
      {metrics.map((m) => (
        <div key={m.key} className={rs.tile}>
          <div className={rs.tileHead}>{m.label}</div>
          <div className={rs.tileValue}>{formatValue(m.current, m.format)}</div>
          <div className={rs.tileSub}>
            <MetricChange m={m} /> {compareLabel.toLowerCase()}: {formatValue(m.previous, m.format)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grouped bars: this period vs the comparison period, per row. */
function CompareBars({ rows, compareName, money = false, horizontal = false, height }: {
  rows: OpsRow[]; compareName: string; money?: boolean; horizontal?: boolean; height?: number;
}) {
  const data = rows.map((r) => ({
    name: r.name,
    current: money ? num(r.amount) : num(r.current),
    previous: money ? num(r.previousAmount) : num(r.previous),
  }));
  if (data.every((d) => d.current === 0 && d.previous === 0)) {
    return <p className={rs.empty}>Nothing recorded in either period.</p>;
  }
  const format: OpsFormat = money ? "money" : "count";
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height ?? Math.max(200, data.length * 46 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={money} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
          <Tooltip content={<ValueTooltip format={format} />} />
          <Legend />
          <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height ?? 260}>
      <BarChart data={data} margin={{ left: 0, right: 8 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
        <YAxis tick={{ fontSize: 12 }} width={money ? 64 : 40} allowDecimals={money} />
        <Tooltip content={<ValueTooltip format={format} />} />
        <Legend />
        <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Table of rows with both periods; optional money column and lead conversion rate. */
function RowsTable({ rows, compareLabel, money = false, conversion = false, unit = "" , empty }: {
  rows: OpsRow[]; compareLabel: string; money?: boolean; conversion?: boolean; unit?: string; empty?: string;
}) {
  if (rows.length === 0) return <p className={rs.empty}>{empty ?? "Nothing recorded in either period."}</p>;
  const value = (r: OpsRow, prev = false) => (money ? num(prev ? r.previousAmount : r.amount) : num(prev ? r.previous : r.current));
  const total = rows.reduce((s, r) => s + value(r), 0);
  const prevTotal = rows.reduce((s, r) => s + value(r, true), 0);
  const show = (v: number) => (money ? <Money value={v} /> : v.toLocaleString());
  const rate = (c?: number, t?: number) => (num(t) > 0 ? `${((num(c) / num(t)) * 100).toFixed(0)}%` : "—");
  return (
    <div className={rs.tableWrap}>
      <table className={rs.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th className={rs.num}>This period</th>
            <th className={rs.num}>{compareLabel}</th>
            <th className={rs.num}>Change</th>
            {conversion && <th className={rs.num}>Converted</th>}
            <th className={rs.shareCol}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const share = total > 0 ? (value(r) / total) * 100 : 0;
            return (
              <tr key={r.name}>
                <td className={rs.name} title={r.name}>{r.name}</td>
                <td className={rs.num}>
                  {show(value(r))}
                  {money && <div className={rs.muted}>{num(r.current).toLocaleString()} {unit}</div>}
                </td>
                <td className={rs.num}>
                  {show(value(r, true))}
                  {money && <div className={rs.muted}>{num(r.previous).toLocaleString()} {unit}</div>}
                </td>
                <td className={rs.num}><ChangeBadge current={value(r)} previous={value(r, true)} /></td>
                {conversion && (
                  <td className={rs.num}>
                    {num(r.converted)} <span className={rs.muted}>({rate(r.converted, r.current)})</span>
                    <div className={rs.muted}>was {num(r.previousConverted)} ({rate(r.previousConverted, r.previous)})</div>
                  </td>
                )}
                <td className={rs.shareCol}>
                  <div className={rs.shareBar}><span style={{ width: `${Math.min(100, share)}%` }} /></div>
                  <span className={rs.muted}>{share.toFixed(1)}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className={rs.num}>{show(total)}</td>
            <td className={rs.num}>{show(prevTotal)}</td>
            <td className={rs.num}><ChangeBadge current={total} previous={prevTotal} /></td>
            {conversion && <td />}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const TREND_LABELS: Record<OpsTrendKey, string> = {
  checkIns: "Check-ins",
  bookings: "Bookings",
  leads: "New leads",
  conversions: "Lead conversions",
  freezes: "Freezes started",
  posSales: "POS sales",
  posNet: "POS net sales",
  joins: "New members",
};

const TREND_TITLES: Record<RevenueGranularity, string> = {
  hourly: "by hour", daily: "by day", weekly: "by week", monthly: "by month",
};

/** Line chart of one trend series, comparison period dotted; a picker when several are offered. */
function TrendPanel({ trend, keys, compareName, granularity, title }: {
  trend: OpsTrendPoint[]; keys: OpsTrendKey[]; compareName: string; granularity: RevenueGranularity; title?: string;
}) {
  const [key, setKey] = useState<OpsTrendKey>(keys[0]);
  const active = keys.includes(key) ? key : keys[0];
  const money = active === "posNet";
  const data = trend.map((p) => ({ label: p.label, current: num(p[active]), previous: p[`${active}Prev`] }));
  const hasPrev = data.some((d) => num(d.previous) > 0);
  return (
    <Panel
      title={title ?? `${TREND_LABELS[active]} ${TREND_TITLES[granularity]}`}
      description={`This period vs ${compareName.toLowerCase()} (dotted), lined up bucket by bucket`}
      actions={keys.length > 1 ? (
        <div className={styles.seriesSwitch} role="group" aria-label="Series">
          {keys.map((k) => (
            <button key={k} type="button" aria-pressed={k === active} onClick={() => setKey(k)}>{TREND_LABELS[k]}</button>
          ))}
        </div>
      ) : undefined}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={16} />
          <YAxis tick={{ fontSize: 12 }} width={money ? 64 : 40} allowDecimals={money} />
          <Tooltip content={<ValueTooltip format={money ? "money" : "count"} />} />
          <Legend />
          {hasPrev && (
            <Line type="monotone" dataKey="previous" name={compareName} stroke={COMPARE_COLOR} strokeWidth={2}
              strokeDasharray="2 4" dot={false} isAnimationActive={false} connectNulls />
          )}
          <Line type="monotone" dataKey="current" name="This period" stroke={CURRENT_COLOR} strokeWidth={2}
            dot={data.length <= 31 ? { r: 3, fill: CURRENT_COLOR } : false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

// ── Areas ───────────────────────────────────────────────────────────────────

type Section = "overview" | "revenue" | "targets" | OpsArea;

const AREAS: { key: OpsArea | "revenue"; label: string; icon: React.ElementType; headline: string[] }[] = [
  { key: "revenue", label: "Revenue", icon: Wallet, headline: ["collection", "net", "transactions", "avgTransaction"] },
  { key: "members", label: "Members", icon: UserPlus, headline: ["joins", "renewals", "ending", "renewalRatio"] },
  { key: "attendance", label: "Attendance", icon: Users, headline: ["checkIns", "uniqueVisitors", "dailyCheckIns", "visitsPerMember"] },
  { key: "bookings", label: "Bookings", icon: CalendarCheck, headline: ["bookings", "showRate", "utilisation", "cancelRate"] },
  { key: "pos", label: "POS", icon: ShoppingCart, headline: ["posNet", "posSales", "posBasket", "posMargin"] },
  { key: "crm", label: "CRM & Leads", icon: Megaphone, headline: ["leads", "conversions", "conversionRate", "followUpsDone"] },
  { key: "freeze", label: "Freezes", icon: Snowflake, headline: ["freezesStarted", "frozenDays", "unfreezes", "freezeCharges"] },
];

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "revenue", label: "Revenue", icon: Wallet },
  { key: "targets", label: "Targets", icon: Target },
  { key: "members", label: "Members", icon: UserPlus },
  { key: "attendance", label: "Attendance", icon: Users },
  { key: "bookings", label: "Bookings", icon: CalendarCheck },
  { key: "pos", label: "POS", icon: ShoppingCart },
  { key: "crm", label: "CRM & Leads", icon: Megaphone },
  { key: "freeze", label: "Freezes", icon: Snowflake },
];

/** Revenue headline figures in the same shape as the operations metrics. */
function revenueMetrics(s: RevenueSummary | null): OpsMetric[] {
  if (!s?.comparison || !s?.insights) return [];
  const area = "revenue" as OpsArea;
  const c = s.comparison;
  return [
    { area, key: "collection", label: "Total collection", current: num(s.totalCollection.total), previous: num(c.totalCollection.total), format: "money", goodWhenUp: true },
    { area, key: "net", label: "Net revenue", current: num(s.netRevenue.total), previous: num(c.netRevenue.total), format: "money", goodWhenUp: true },
    { area, key: "expenses", label: "Expenses", current: num(s.expenses.total), previous: num(c.expenses.total), format: "money", goodWhenUp: false },
    { area, key: "transactions", label: "Transactions", current: num(s.insights.transactions), previous: num(c.transactions), format: "count", goodWhenUp: true },
    { area, key: "avgTransaction", label: "Avg. transaction", current: num(s.insights.avgTransaction), previous: num(c.avgTransaction), format: "money", goodWhenUp: true },
    { area, key: "payingMembers", label: "Paying members", current: num(s.insights.payingMembers), previous: num(c.payingMembers), format: "count", goodWhenUp: true },
  ];
}

// The "what moved" chart: headline counts/amounts only (rates move in points, not %)
const MOVER_KEYS = [
  "collection", "net", "joins", "renewals", "checkIns", "uniqueVisitors", "bookings", "noShows", "cancellations",
  "posNet", "posSales", "leads", "conversions", "followUpsDone", "enquiries", "freezesStarted", "frozenDays",
];

function MoversChart({ metrics, compareName }: { metrics: OpsMetric[]; compareName: string }) {
  const rows = MOVER_KEYS
    .map((k) => metrics.find((m) => m.key === k))
    .filter((m): m is OpsMetric => !!m && m.current !== null && num(m.previous) > 0)
    .map((m) => {
      const pct = pctChange(num(m.current), num(m.previous)) ?? 0;
      return { name: m.label, pct, shown: Math.max(-150, Math.min(150, pct)), good: Math.abs(pct) < 0.05 ? null : (pct > 0) === m.goodWhenUp };
    });
  if (rows.length === 0) {
    return <p className={rs.empty}>Not enough activity in {compareName.toLowerCase()} to compare against yet.</p>;
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={rows.length * 30 + 40}>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 56 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[-150, 150]} ticks={[-150, -100, -50, 0, 50, 100, 150]}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
          <ReferenceLine x={0} stroke="var(--muted-foreground)" />
          <Tooltip
            cursor={{ fill: "rgb(148 163 184 / 0.12)" }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              return (
                <div className={rs.tooltip}>
                  <p className={rs.tooltipTitle}>{r.name}</p>
                  <p>{r.pct > 0 ? "+" : ""}{r.pct.toFixed(1)}% vs {compareName.toLowerCase()}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="shown" radius={4} isAnimationActive={false} barSize={14}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.good === null ? COMPARE_COLOR : r.good ? GOOD_COLOR : BAD_COLOR} />
            ))}
            <LabelList dataKey="pct" position="right" style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              formatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.legendNote}>
        <span><i className={styles.swatch} style={{ background: GOOD_COLOR }} />Better</span>
        <span><i className={styles.swatch} style={{ background: BAD_COLOR }} />Worse</span>
        <span><i className={styles.swatch} style={{ background: COMPARE_COLOR }} />No change</span>
        <span>Bars stop at ±150%; the label shows the real change. Metrics with nothing in {compareName.toLowerCase()} are left out.</span>
      </div>
    </>
  );
}

function AllMetricsTable({ metrics, compareLabel }: { metrics: OpsMetric[]; compareLabel: string }) {
  return (
    <div className={rs.tableWrap}>
      <table className={rs.table}>
        <thead>
          <tr>
            <th>Metric</th>
            <th className={rs.num}>This period</th>
            <th className={rs.num}>{compareLabel}</th>
            <th className={rs.num}>Change</th>
          </tr>
        </thead>
        <tbody>
          {AREAS.map((area) => {
            const ms = metrics.filter((m) => m.area === area.key);
            if (!ms.length) return null;
            return (
              <React.Fragment key={area.key}>
                <tr className={styles.groupRow}><td colSpan={4}>{area.label}</td></tr>
                {ms.map((m) => (
                  <tr key={m.key}>
                    <td className={rs.name}>{m.label}</td>
                    <td className={rs.num}>{formatValue(m.current, m.format)}</td>
                    <td className={rs.num}>{formatValue(m.previous, m.format)}</td>
                    <td className={rs.num}><MetricChange m={m} /></td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Business comparison (every area, both periods) as an export / print document. */
function buildComparisonReport(metrics: OpsMetric[], ops: OperationsComparison): ReportDocument {
  const fmtOf = (f: OpsFormat): ValueFormat => (f === "money" ? "money" : f === "count" ? "integer" : f === "percent" ? "percent" : f === "minutes" ? "duration" : "number");
  const groups: { title: string; test: (f: OpsFormat) => boolean }[] = [
    { title: "Amounts", test: (f) => f === "money" },
    { title: "Counts", test: (f) => f === "count" },
    { title: "Rates", test: (f) => f === "percent" },
    { title: "Averages & durations", test: (f) => f !== "money" && f !== "count" && f !== "percent" },
  ];
  const areaLabel = (k: string) => AREAS.find((a) => a.key === k)?.label ?? k;
  const order = (k: string) => AREAS.findIndex((a) => a.key === k);
  return {
    title: "Business Comparison Report",
    fileName: "Business Comparison",
    period: { from: ops.from, to: ops.to },
    filters: [{ label: "Compared with", value: `${ops.label} (${formatRange(ops.previousFrom, ops.previousTo)})` }],
    sections: [
      ...groups.map(({ title, test }) => {
        const list = metrics.filter((m) => test(m.format)).sort((a, b) => order(a.area) - order(b.area));
        const format = list[0] ? fmtOf(list[0].format) : "number";
        const unit = (m: OpsMetric) => (m.format === "days" ? " (days)" : m.format === "hours" ? " (hours)" : "");
        return tableSection(`Comparison · ${title.toLowerCase()}`, [
          col("area", "Area"), col("metric", "Metric"), col("cur", "This period", format), col("prev", ops.label, format),
          col("change", title === "Rates" ? "Change (pts)" : "Change", title === "Rates" ? "number" : "percent"),
        ], list.map((m) => {
          const change = m.current === null || m.previous === null ? "—"
            : m.format === "percent" ? Math.round((num(m.current) - num(m.previous)) * 10) / 10
            : (() => { const p = pctChange(num(m.current), num(m.previous)); return p === null ? "New" : Math.round(p * 10) / 10; })();
          return { area: areaLabel(m.area), metric: m.label + unit(m), cur: m.current ?? "—", prev: m.previous ?? "—", change };
        }));
      }),
      ...(Object.keys(TREND_LABELS) as OpsTrendKey[]).filter((k) => ops.trend.some((p) => num(p[k]) > 0 || num(p[`${k}Prev`]) > 0)).map((k) =>
        chartFromRows(TREND_LABELS[k], "line", ops.trend, "label", [
          { key: (p: OpsTrendPoint) => num(p[k]), name: "This period", color: "#2a78d6" },
          { key: (p: OpsTrendPoint) => num(p[`${k}Prev`]), name: ops.label, color: "#8a8780" },
        ], { valueFormat: k === "posSales" || k === "posNet" ? "money" : "integer" })),
      ...([
        ["Freezes by reason", ops.freeze.byReason], ["Freezes by source", ops.freeze.bySource], ["Freezes by plan", ops.freeze.byPlan], ["Freezes by length", ops.freeze.byLength],
        ["Leads by status", ops.crm.byStatus], ["Leads by source", ops.crm.bySource], ["Leads by staff", ops.crm.byStaff], ["Enquiry categories", ops.crm.enquiryCategories],
        ["POS by cashier", ops.pos.byCashier], ["POS by terminal", ops.pos.byTerminal], ["POS by customer", ops.pos.byCustomer], ["POS by weekday", ops.pos.byWeekday],
        ["Check-ins by weekday", ops.attendance.byWeekday], ["Check-ins by hour", ops.attendance.byHour], ["Check-ins by method", ops.attendance.byMethod],
        ["Bookings by status", ops.bookings.byStatus], ["Bookings by type", ops.bookings.byType], ["Top sessions", ops.bookings.topSessions], ["Bookings by trainer", ops.bookings.byTrainer], ["Bookings by weekday", ops.bookings.byWeekday],
        ["Members by receipt type", ops.members.byReceiptType],
      ] as [string, OpsRow[] | undefined][]).filter(([, rows]) => rows && rows.length).map(([title, rows]) => {
        const list = rows!;
        const money = list.some((r) => r.amount != null);
        const leads = list.some((r) => r.converted != null);
        return tableSection(title, [
          col("name", "Name"), col("current", "This period", "integer", { total: "sum" }), col("previous", ops.label, "integer", { total: "sum" }),
          ...(money ? [col("amount", "Amount", "money", { total: "sum" }), col("previousAmount", `${ops.label} amount`, "money", { total: "sum" })] : []),
          ...(leads ? [col("converted", "Converted", "integer", { total: "sum" }), col("previousConverted", `${ops.label} converted`, "integer", { total: "sum" })] : []),
          col("change", "Change", "percent"),
        ], list.map((r) => {
          const p = money ? pctChange(num(r.amount), num(r.previousAmount)) : pctChange(num(r.current), num(r.previous));
          return { ...r, change: p === null ? "New" : Math.round(p * 10) / 10 };
        }), { totals: true });
      }),
      tableSection("Trend", [
        col("label", "Period"),
        ...(Object.entries(TREND_LABELS) as [OpsTrendKey, string][]).flatMap(([k, l]) => [
          col(k, l, k === "posSales" || k === "posNet" ? "money" : "integer"), col(`${k}Prev`, `${l} (${ops.label})`, k === "posSales" || k === "posNet" ? "money" : "integer"),
        ]),
      ], ops.trend),
    ],
  };
}

// ── Targets ─────────────────────────────────────────────────────────────────

const attain = (achieved: number, target: number) => (target > 0 ? (achieved / target) * 100 : null);

function PtsChange({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return <span className={`${styles.pts} ${styles.ptsFlat}`}>—</span>;
  return <MetricChange m={{ current, previous, format: "percent", goodWhenUp: true }} />;
}

function Meter({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <div className={styles.meter} role="img" aria-label={`${v.toFixed(0)}% of target`}>
      <span className={v >= 100 ? styles.met : undefined} style={{ width: `${Math.min(100, v)}%` }} />
    </div>
  );
}

function TargetsSection({ from, to, compare, refreshKey, compareName }: {
  from: string; to: string; compare: RevenueCompareMode; refreshKey: number; compareName: string;
}) {
  const [data, setData] = useState<TargetsComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService.getRevenueTargets(from, to, compare)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setData(res.data);
        else setError(res?.error || "Could not load targets");
      })
      .catch((e) => { if (!cancelled) setError(e?.message || "Could not load targets"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, compare, refreshKey, retry]);

  if (loading && !data) return <div className={styles.loading}><Loader2 className="h-4 w-4 animate-spin" />Working out targets and live progress…</div>;
  if (error) {
    return (
      <div className={styles.error}>
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={() => setRetry((r) => r + 1)}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    );
  }
  if (!data) return null;

  const cur = data.institution;
  const pre = data.previousInstitution;
  const cats: { name: string; t: number; a: number; pt: number; pa: number }[] = [
    { name: "Overall", t: num(cur.target), a: num(cur.achieved), pt: num(pre.target), pa: num(pre.achieved) },
    { name: "Membership", t: num(cur.membershipTarget), a: num(cur.membershipAchieved), pt: num(pre.membershipTarget), pa: num(pre.membershipAchieved) },
    { name: "POS", t: num(cur.posTarget), a: num(cur.posAchieved), pt: num(pre.posTarget), pa: num(pre.posAchieved) },
    { name: "Personal training", t: num(cur.ptTarget), a: num(cur.ptAchieved), pt: num(pre.ptTarget), pa: num(pre.ptAchieved) },
  ].filter((c) => c.t > 0 || c.pt > 0);
  const attainChart = cats.map((c) => ({ name: c.name, current: attain(c.a, c.t), previous: attain(c.pa, c.pt) }));
  const history = data.history.map((h: TargetTotals) => ({
    name: h.month,
    achieved: num(h.achieved),
    target: h.hasTarget && num(h.target) > 0 ? num(h.target) : null,
  }));
  const staff = data.staff.filter((s: StaffTargetCompareRow) => num(s.target) > 0 || num(s.previousTarget) > 0);
  const staffChart = staff.slice(0, 12).map((s) => ({
    name: s.name, current: attain(num(s.achieved), num(s.target)), previous: attain(num(s.previousAchieved), num(s.previousTarget)),
  }));
  const teamT = staff.reduce((s, r) => s + num(r.target), 0);
  const teamA = staff.reduce((s, r) => s + num(r.achieved), 0);
  const teamPT = staff.reduce((s, r) => s + num(r.previousTarget), 0);
  const teamPA = staff.reduce((s, r) => s + num(r.previousAchieved), 0);
  const months = data.months.join(", ");
  const prevMonths = data.previousMonths.join(", ");

  return (
    <div className={rs.stack}>
      <div className={styles.note}>
        <Info size={16} />
        <span>
          Targets are monthly, so this compares the target months the range touches (<strong>{months}</strong>) with {prevMonths}.
          Achieved is the live whole-month figure from Staff Targets.
          {data.sameMonths && " Both periods fall in the same month, so the figures match. Pick “Same period last year” or a longer range to compare different months."}
        </span>
      </div>

      <div className={rs.tiles}>
        {[
          { label: "Institution target", v: num(cur.target), p: num(pre.target), money: true },
          { label: "Institution achieved", v: num(cur.achieved), p: num(pre.achieved), money: true },
          { label: "Institution attainment", v: attain(num(cur.achieved), num(cur.target)), p: attain(num(pre.achieved), num(pre.target)), pct: true },
          { label: "Team target (staff)", v: teamT, p: teamPT, money: true },
          { label: "Team achieved (staff)", v: teamA, p: teamPA, money: true },
          { label: "Team attainment", v: attain(teamA, teamT), p: attain(teamPA, teamPT), pct: true },
        ].map((t) => (
          <div key={t.label} className={rs.tile}>
            <div className={rs.tileHead}>{t.label}</div>
            <div className={rs.tileValue}>{t.v === null ? "No target" : t.pct ? `${t.v.toFixed(1)}%` : <Money value={t.v} />}</div>
            <div className={rs.tileSub}>
              {t.pct ? <PtsChange current={t.v} previous={t.p} /> : <ChangeBadge current={num(t.v)} previous={num(t.p)} />}
              {" "}{compareName.toLowerCase()}: {t.p === null ? "no target" : t.pct ? `${t.p.toFixed(1)}%` : <Money value={t.p} />}
            </div>
          </div>
        ))}
      </div>

      {!cur.hasTarget && !pre.hasTarget ? (
        <div className={styles.note}><Info size={16} /><span>No institution-wide target was set for {months} or {prevMonths}. Set one in Staff Targets › Set Targets (scope: Institution).</span></div>
      ) : (
        <Panel title="Institutional Target vs Achieved" description={`${months} vs ${prevMonths}`}>
            <div className={rs.tableWrap}>
              <table className={rs.table}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className={rs.num}>Target</th>
                    <th className={rs.num}>Achieved</th>
                    <th>Attainment</th>
                    <th className={rs.num}>{compareName}</th>
                    <th className={rs.num}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => {
                    const a = attain(c.a, c.t);
                    const p = attain(c.pa, c.pt);
                    return (
                      <tr key={c.name}>
                        <td className={rs.name}>{c.name}</td>
                        <td className={rs.num}>{c.t > 0 ? <Money value={c.t} /> : "—"}</td>
                        <td className={rs.num}><Money value={c.a} /></td>
                        <td><Meter value={a} /><span className={rs.muted}>{a === null ? "No target" : `${a.toFixed(1)}%`}</span></td>
                        <td className={rs.num}>{p === null ? "No target" : `${p.toFixed(1)}%`}<div className={rs.muted}><Money value={c.pa} /> of {c.pt > 0 ? <Money value={c.pt} /> : "—"}</div></td>
                        <td className={rs.num}><PtsChange current={a} previous={p} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </Panel>
      )}

      <div className={rs.grid2}>
        {(cur.hasTarget || pre.hasTarget) && (
          <Panel title="Attainment by Category" description="% of the institution target reached, this period vs comparison">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attainChart} margin={{ left: 0, right: 8 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} width={44} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine y={100} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: "Target", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip content={<ValueTooltip format="percent" />} />
                <Legend />
                <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
        <Panel title="Staff Attainment" description={`% of each person's revenue target, ${months} vs ${prevMonths}`}>
          {staffChart.length === 0 ? <p className={rs.empty}>No staff targets set for these months.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(260, staffChart.length * 46 + 40)}>
              <BarChart data={staffChart} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <ReferenceLine x={100} stroke={TARGET_COLOR} strokeDasharray="4 4" />
                <Tooltip content={<ValueTooltip format="percent" />} />
                <Legend />
                <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel title="Institutional Target History" description="Last 12 months: what the gym took (bars) against its institution-wide target (line; gaps = no target set)">
        {history.every((h) => h.achieved === 0 && h.target === null) ? (
          <p className={rs.empty}>No targets or takings in the last 12 months.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={history} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} minTickGap={8} />
              <YAxis tick={{ fontSize: 12 }} width={64} />
              <Tooltip content={<ValueTooltip format="money" />} />
              <Legend />
              <Bar dataKey="achieved" name="Achieved" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line type="monotone" dataKey="target" name="Target" stroke={TARGET_COLOR} strokeWidth={2} strokeDasharray="6 4"
                dot={{ r: 3, fill: TARGET_COLOR }} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Staff Targets" description="Revenue target vs achieved per person">
          {staff.length === 0 ? <p className={rs.empty}>No staff targets set for these months.</p> : (
            <div className={rs.tableWrap}>
              <table className={rs.table}>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th className={rs.num}>Target</th>
                    <th className={rs.num}>Achieved</th>
                    <th>Attainment</th>
                    <th className={rs.num}>{compareName}</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const a = attain(num(s.achieved), num(s.target));
                    const p = attain(num(s.previousAchieved), num(s.previousTarget));
                    return (
                      <tr key={s.name}>
                        <td className={rs.name} title={s.name}>{s.name}{s.role && <div className={rs.muted}>{s.role}</div>}</td>
                        <td className={rs.num}>{num(s.target) > 0 ? <Money value={s.target} /> : "—"}</td>
                        <td className={rs.num}><Money value={s.achieved} /></td>
                        <td><Meter value={a} /><span className={rs.muted}>{a === null ? "No target" : `${a.toFixed(0)}%`}</span></td>
                        <td className={rs.num}>{p === null ? "—" : `${p.toFixed(0)}%`}<div><PtsChange current={a} previous={p} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Panel>
    </div>
  );
}

// ── Hub ─────────────────────────────────────────────────────────────────────

export function ComparisonHub({ summary, from, to, granularity, compare, refreshKey, currencyCode }: {
  summary: RevenueSummary | null;
  from: string;
  to: string;
  granularity?: RevenueGranularity;
  compare: RevenueCompareMode;
  refreshKey: number;
  currencyCode: string;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [ops, setOps] = useState<OperationsComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService.getRevenueOperations(from, to, granularity, compare)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setOps(res.data);
        else setError(res?.error || "Could not load comparison data");
      })
      .catch((e) => { if (!cancelled) setError(e?.message || "Could not load comparison data"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, granularity, compare, refreshKey, retry]);

  const metrics = useMemo(() => [...revenueMetrics(summary), ...(ops?.metrics ?? [])], [summary, ops]);
  const compareName = ops?.label ?? summary?.comparison?.label ?? "Previous period";
  const compareLabel = compare === "last-year" ? "Last year" : "Previous";
  const of = (area: OpsArea) => metrics.filter((m) => m.area === area);

  const nav = (
    <div className={styles.subnav} role="group" aria-label="Comparison section">
      {SECTIONS.map((s) => (
        <button key={s.key} type="button" aria-pressed={section === s.key} onClick={() => setSection(s.key)}>
          <s.icon size={14} />{s.label}
        </button>
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  if (section === "revenue") {
    body = summary?.insights && summary?.comparison
      ? <RevenueComparisonTab data={summary} />
      : <p className={rs.empty}>Revenue comparison isn't available yet.</p>;
  } else if (section === "targets") {
    body = <TargetsSection from={from} to={to} compare={compare} refreshKey={refreshKey} compareName={compareName} />;
  } else if (loading && !ops) {
    body = <div className={styles.loading}><Loader2 className="h-4 w-4 animate-spin" />Loading comparisons…</div>;
  } else if (error && !ops) {
    body = (
      <div className={styles.error}>
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={() => setRetry((r) => r + 1)}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    );
  } else if (ops) {
    const g = ops.granularity;
    switch (section) {
      case "overview":
        body = (
          <>
            <div className={rs.reportBar}>
              <p>
                <strong>{formatRange(ops.from, ops.to)}</strong>{ops.toDate ? " (up to today)" : ""} compared with {compareName.toLowerCase()} ({formatRange(ops.previousFrom, ops.previousTo)}) across every part of the gym.
                {ops.toDate && " Both periods stop at the same point, so the comparison is like-for-like."}
              </p>
              <ReportActions report={() => buildComparisonReport(metrics, ops)} menuLabel="Business comparison" compact />
            </div>
            {/* All seven areas side by side on wide screens (container query in the module) */}
            <div className={styles.areaWrap}>
              <div className={styles.areaGrid}>
                {AREAS.map((area) => {
                  const ms = area.headline.map((k) => metrics.find((m) => m.key === k)).filter((m): m is OpsMetric => !!m);
                  if (!ms.length) return null;
                  return (
                    <div key={area.key} className={styles.areaCard}>
                      <div className={styles.areaHead}>
                        <h4 className={styles.areaTitle}><area.icon size={15} />{area.label}</h4>
                        <button type="button" className={styles.areaLink} onClick={() => setSection(area.key)}
                          aria-label={`${area.label} details`} title="Details"><ChevronRight size={14} /></button>
                      </div>
                      {ms.map((m) => (
                        <div key={m.key} className={styles.areaRow}>
                          <span className={styles.areaLabel} title={m.label}>{m.label}</span>
                          <span className={styles.areaValue}>{formatValue(m.current, m.format)}</span>
                          <span className={styles.areaSub}>
                            <MetricChange m={m} />
                            <span className={styles.prevValue}>{compareLabel}: {formatValue(m.previous, m.format)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={rs.grid2}>
              <Panel title="What Moved" description={`% change vs ${compareName.toLowerCase()}, coloured by whether the move is good for the gym`}>
                <MoversChart metrics={metrics} compareName={compareName} />
              </Panel>
              <TrendPanel trend={ops.trend} granularity={g} compareName={compareName}
                keys={["checkIns", "bookings", "joins", "leads", "posNet", "freezes"]} title="Activity Trend" />
            </div>
            <Panel title="All Metrics" description="Every figure on this page, side by side">
              <AllMetricsTable metrics={metrics} compareLabel={compareLabel} />
            </Panel>
          </>
        );
        break;
      case "freeze": {
        const frozenShare = num(ops.freeze.activeMembers) > 0 ? (num(ops.freeze.frozenNow) / num(ops.freeze.activeMembers)) * 100 : 0;
        body = (
          <>
            <div className={styles.note}>
              <Snowflake size={16} />
              <span><strong>{num(ops.freeze.frozenNow).toLocaleString()}</strong> member{num(ops.freeze.frozenNow) === 1 ? " is" : "s are"} frozen right now ({frozenShare.toFixed(1)}% of active and frozen members). Member-days frozen counts every frozen day inside each period, including freezes that started earlier.</span>
            </div>
            <MetricTiles metrics={of("freeze")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["freezes"]} granularity={g} compareName={compareName} />
              <Panel title="Freeze Length" description="Requested length of freezes started in each period">
                <CompareBars rows={ops.freeze.byLength} compareName={compareName} />
              </Panel>
              <Panel title="Freeze Reasons" description="Why members froze">
                <CompareBars rows={ops.freeze.byReason} compareName={compareName} horizontal />
              </Panel>
              <Panel title="Freezes by Plan" description="Which memberships get frozen">
                <RowsTable rows={ops.freeze.byPlan} compareLabel={compareLabel} />
              </Panel>
              <Panel title="Requested From" description="Where freezes were requested">
                <RowsTable rows={ops.freeze.bySource} compareLabel={compareLabel} />
              </Panel>
            </div>
          </>
        );
        break;
      }
      case "crm":
        body = (
          <>
            <MetricTiles metrics={of("crm")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["leads", "conversions"]} granularity={g} compareName={compareName} />
              <Panel title="Lead Pipeline" description="Current status of the leads created in each period">
                <CompareBars rows={ops.crm.byStatus} compareName={compareName} />
              </Panel>
              <Panel title="Lead Sources" description="Where leads came from, with how many converted">
                <RowsTable rows={ops.crm.bySource} compareLabel={compareLabel} conversion />
              </Panel>
              <Panel title="Leads by Staff" description="Assigned staff, with conversions">
                <RowsTable rows={ops.crm.byStaff} compareLabel={compareLabel} conversion />
              </Panel>
              <Panel title="Lead Sources Compared">
                <CompareBars rows={ops.crm.bySource} compareName={compareName} horizontal />
              </Panel>
              <Panel title="Member Enquiries" description="Enquiries members raised, by category">
                <RowsTable rows={ops.crm.enquiryCategories} compareLabel={compareLabel} empty="No member enquiries in either period." />
              </Panel>
            </div>
          </>
        );
        break;
      case "pos":
        body = (
          <>
            <MetricTiles metrics={of("pos")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["posNet", "posSales"]} granularity={g} compareName={compareName} />
              <Panel title="POS Sales by Day of Week" description="Number of sales">
                <CompareBars rows={ops.pos.byWeekday} compareName={compareName} />
              </Panel>
              <Panel title="Sales by Cashier" description="Net sales (after refunds) each cashier rang up">
                <RowsTable rows={ops.pos.byCashier} compareLabel={compareLabel} money unit="sales" />
              </Panel>
              <Panel title="Sales by Terminal">
                <RowsTable rows={ops.pos.byTerminal} compareLabel={compareLabel} money unit="sales" />
              </Panel>
              <Panel title="Members vs Walk-in Customers" description="Net sales by customer type">
                <CompareBars rows={ops.pos.byCustomer} compareName={compareName} money />
              </Panel>
              <Panel title="Cashiers Compared" description="Net sales">
                <CompareBars rows={ops.pos.byCashier} compareName={compareName} money horizontal />
              </Panel>
            </div>
          </>
        );
        break;
      case "attendance":
        body = (
          <>
            <MetricTiles metrics={of("attendance")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["checkIns"]} granularity={g} compareName={compareName} />
              <Panel title="Check-ins by Day of Week">
                <CompareBars rows={ops.attendance.byWeekday} compareName={compareName} />
              </Panel>
              <Panel title="Busiest Hours" description="Check-ins by hour of day, this period vs comparison (dotted)">
                {ops.attendance.byHour.every((h) => num(h.current) === 0 && num(h.previous) === 0) ? (
                  <p className={rs.empty}>No check-ins in either period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={ops.attendance.byHour.map((h) => ({ name: h.name, current: num(h.current), previous: num(h.previous) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 12 }} width={40} allowDecimals={false} />
                      <Tooltip content={<ValueTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="previous" name={compareName} stroke={COMPARE_COLOR} strokeWidth={2} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="current" name="This period" stroke={CURRENT_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title="How Members Checked In">
                <RowsTable rows={ops.attendance.byMethod} compareLabel={compareLabel} empty="No check-ins in either period." />
              </Panel>
            </div>
          </>
        );
        break;
      case "bookings":
        body = (
          <>
            <MetricTiles metrics={of("bookings")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["bookings"]} granularity={g} compareName={compareName} />
              <Panel title="Booking Status" description="Bookings on sessions dated in each period">
                <CompareBars rows={ops.bookings.byStatus} compareName={compareName} horizontal />
              </Panel>
              <Panel title="Top Sessions" description="Seat-holding bookings per session name">
                <CompareBars rows={ops.bookings.topSessions} compareName={compareName} horizontal />
              </Panel>
              <Panel title="Bookings by Trainer">
                <RowsTable rows={ops.bookings.byTrainer} compareLabel={compareLabel} />
              </Panel>
              <Panel title="Classes vs Personal Training">
                <CompareBars rows={ops.bookings.byType} compareName={compareName} />
              </Panel>
              <Panel title="Bookings by Day of Week">
                <CompareBars rows={ops.bookings.byWeekday} compareName={compareName} />
              </Panel>
            </div>
          </>
        );
        break;
      case "members":
        body = (
          <>
            <MetricTiles metrics={of("members")} compareLabel={compareLabel} />
            <div className={rs.grid2}>
              <TrendPanel trend={ops.trend} keys={["joins"]} granularity={g} compareName={compareName} />
              <Panel title="Membership Sales Mix" description="Paid receipts by type (count)">
                <CompareBars rows={ops.members.byReceiptType} compareName={compareName} horizontal />
              </Panel>
            </div>
            <Panel title="Membership Sales by Type" description="Receipts and money received">
              <RowsTable rows={ops.members.byReceiptType} compareLabel={compareLabel} money unit="receipts" />
            </Panel>
          </>
        );
        break;
    }
  }

  return (
    <div className={rs.stack}>
      {nav}
      {loading && ops && section !== "targets" && section !== "revenue" && (
        <div className={rs.muted}><Loader2 className="inline h-3 w-3 animate-spin" /> Updating…</div>
      )}
      {body}
    </div>
  );
}
