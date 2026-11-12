import React, { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CurrencyGlyph } from "../../utils/currency";
import type {
  OpsFormat, OpsMetric, OpsRow, OpsTrendKey, OpsTrendPoint, RevenueGranularity,
} from "../../utils/supabase/dashboard-service";
import { ChangeBadge } from "./RevenueReports";
import rs from "./RevenueReports.module.css";
import styles from "./RevenueOperations.module.css";

/* Building blocks shared by the Business Insights sections: values in their unit,
   period-vs-period tiles, grouped bars, tables and trend lines. */

// Current period in the theme colour, comparison period in neutral grey (same as the revenue charts)
export const CURRENT_COLOR = "var(--gb-primary-deep)";
export const COMPARE_COLOR = "#94A3B8";
export const GOOD_COLOR = "#1baf7a";
export const BAD_COLOR = "#e34948";
export const TARGET_COLOR = "#eb6834";

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function Money({ value, digits = 2 }: { value: unknown; digits?: number }) {
  return (
    <span className={rs.money}>
      <CurrencyGlyph />
      {num(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}
    </span>
  );
}

/** A metric value in its unit; null = not measurable (e.g. a rate with nothing to measure). */
export function formatValue(v: number | null | undefined, format: OpsFormat): React.ReactNode {
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

export function formatPlain(v: number | null, format: OpsFormat) {
  if (v === null || !Number.isFinite(v)) return "";
  if (format === "money") return v.toFixed(2);
  if (format === "count") return String(Math.round(v));
  return v.toFixed(1);
}

/** Rates move in percentage points; everything else in % change. */
export function MetricChange({ m }: { m: Pick<OpsMetric, "current" | "previous" | "format" | "goodWhenUp"> }) {
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

export const ValueTooltip = ({ active, payload, label, format = "count", suffix }: any) => {
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

export function Panel({ title, description, actions, children }: {
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
export function MetricTiles({ metrics, compareLabel }: { metrics: OpsMetric[]; compareLabel: string }) {
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
export function CompareBars({ rows, compareName, money = false, horizontal = false, height }: {
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
export function RowsTable({ rows, compareLabel, money = false, conversion = false, conversionLabel = "Converted", unit = "", empty }: {
  rows: OpsRow[]; compareLabel: string; money?: boolean; conversion?: boolean; conversionLabel?: string; unit?: string; empty?: string;
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
            {conversion && <th className={rs.num}>{conversionLabel}</th>}
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

export const TREND_LABELS: Record<OpsTrendKey, string> = {
  checkIns: "Check-ins",
  bookings: "Bookings",
  leads: "New leads",
  conversions: "Lead conversions",
  freezes: "Freezes started",
  posSales: "POS sales",
  posNet: "POS net sales",
  joins: "New members",
};

export const TREND_TITLES: Record<RevenueGranularity, string> = {
  hourly: "by hour", daily: "by day", weekly: "by week", monthly: "by month",
};

/** Line chart of one trend series, comparison period dotted; a picker when several are offered. */
export function TrendPanel({ trend, keys, compareName, granularity, title }: {
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

