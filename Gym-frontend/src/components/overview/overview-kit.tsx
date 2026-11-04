/**
 * Building blocks for the module overview pages (Member Connect, Sales & Purchases, Financials,
 * Payroll & Employees). Same look as the Analytics Dashboard: cards, KPI tiles and tones come from
 * components/analytics/community-analytics.module.css, the section tab bar from
 * components/reports/reports-analytics.module.css. Chart colours are the validated dataviz slots
 * (fixed, not the user's theme) so series stay distinguishable in every theme.
 */
import React, { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import styles from "../analytics/community-analytics.module.css";
import rs from "../reports/reports-analytics.module.css";

export { styles, rs };

export type IconT = React.ComponentType<{ size?: number; className?: string }>;

const LIGHT = { s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#6250d6", s5: "#b45309", s6: "#0e9fb5", grid: "#e9e8e3", axis: "#898781", soft: "#b7d3f6", good: "#0ca30c", bad: "#d03b3b" };
const DARK = { s1: "#3987e5", s2: "#d95926", s3: "#199e70", s4: "#8a7cf0", s5: "#d4a017", s6: "#22b8cf", grid: "#2c2c2a", axis: "#898781", soft: "#184f95", good: "#4ade80", bad: "#f87171" };
export type Palette = typeof LIGHT;
/** Categorical series, in order. */
export const seriesOf = (p: Palette) => [p.s1, p.s2, p.s3, p.s4, p.s5, p.s6];

export function usePalette(): Palette {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

export const axisTick = (p: Palette) => ({ fill: p.axis, fontSize: 11 });

/** % change badge. null → nothing (no comparison possible). `upIsGood` false for costs. */
export function Delta({ pct, upIsGood = true, suffix }: { pct: number | null | undefined; upIsGood?: boolean; suffix?: string }) {
  if (pct == null || Number.isNaN(pct) || !Number.isFinite(pct)) return null;
  if (Math.abs(pct) < 0.05) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0%{suffix ? ` ${suffix}` : ""}</span>;
  const up = pct > 0;
  const good = up === upIsGood;
  return (
    <span className={styles.delta} data-tone={good ? "good" : "bad"} title={good ? "Better than the comparison period" : "Worse than the comparison period"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/** % change, or null when there is nothing to compare with (previous period zero). */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function Kpi({ icon: Icon, tone, label, value, delta, hint, onClick, title }: {
  icon: IconT; tone: string; label: string; value: React.ReactNode; delta?: React.ReactNode; hint?: React.ReactNode;
  onClick?: () => void; title?: string;
}) {
  const body = (
    <>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiFoot}>{delta}{hint != null && <span>{hint}</span>}</div>
    </>
  );
  return onClick
    ? <button type="button" className={`${styles.card} ${styles.kpi}`} onClick={onClick} title={title}>{body}</button>
    : <div className={`${styles.card} ${styles.kpi}`} title={title}>{body}</div>;
}

export function Panel({ title, sub, scope, icon: Icon, action, children, id }: {
  title: string; sub?: React.ReactNode; scope?: string; icon?: IconT; action?: React.ReactNode; children: React.ReactNode; id?: string;
}) {
  return (
    <div id={id} className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icon && <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone="teal"><Icon size={14} /></span>}
            {title}{scope && <span className={styles.scope}>{scope}</span>}
          </h3>
          {sub && <div className={styles.panelSub}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{payload[0]?.payload?.tipLabel ?? label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <div key={p.dataKey ?? p.name} className={styles.tooltipRow}>
          <span className={styles.tooltipKey}>
            <span className={styles.swatch} style={{ ["--sw" as any]: p.payload?.color || p.color || p.stroke || p.fill }} />{p.name}
          </span>
          <span className={styles.tooltipVal}>{fmt ? fmt(p.value, p) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className={styles.legend}>
      {items.map(i => (
        <span key={i.label} className={styles.legendItem}>
          <span className={i.line ? styles.swatchLine : styles.swatch} style={{ ["--sw" as any]: i.color }} />{i.label}
        </span>
      ))}
    </div>
  );
}

export function BarRows({ rows, fmt, empty }: {
  rows: { key: string; label: React.ReactNode; value: number; color: string; meta?: React.ReactNode }[];
  fmt: (n: number) => string; empty: string;
}) {
  if (!rows.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className={styles.barRows}>
      {rows.map(r => (
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

export function Empty({ icon: Icon, title, text, action }: { icon?: IconT; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      {Icon && <Icon size={26} />}
      <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
      {text && <div style={{ maxWidth: "28rem", fontSize: "var(--text-xs)" }}>{text}</div>}
      {action}
    </div>
  );
}

export function SectionTabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: { id: T; label: string; icon?: IconT; count?: number }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className={`${styles.card} ${rs.tabsBar}`} role="tablist" aria-label={label}>
      {tabs.map(({ id, label: l, icon: Icon, count }) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} data-active={value === id} className={rs.tab} onClick={() => onChange(id)}>
          {Icon && <Icon size={15} />}{l}
          {count != null && count > 0 && <span className={styles.scope} style={{ marginLeft: 2, color: "inherit", background: "color-mix(in srgb, currentColor 14%, transparent)" }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; label: string;
}) {
  return (
    <div className={styles.seg} role="tablist" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={styles.segBtn} data-active={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

/** Status pill using the module's good/warning/critical/info colours. */
export function Status({ kind, children }: { kind: "good" | "warning" | "critical" | "info"; children: React.ReactNode }) {
  return <span className={styles.status} data-status={kind}>{children}</span>;
}

// ── Periods ──
export type Period = "mtd" | "last" | "q" | "ytd";
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

/**
 * Date range + comparison for each period. Comparisons are like-for-like: a month in progress is
 * compared with the same days of last month (not the whole of last month, which always showed
 * "-100%" early in the month).
 */
export function periodRange(p: Period, today = new Date()) {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  if (p === "mtd") {
    const prevLen = new Date(y, m, 0).getDate();
    return {
      from: isoDate(new Date(y, m, 1)), to: isoDate(today), compareFrom: isoDate(new Date(y, m - 1, 1)), compareTo: isoDate(new Date(y, m - 1, Math.min(d, prevLen))),
      label: monthName(today) + " so far", vs: "vs same days last month",
    };
  }
  if (p === "last") {
    return {
      from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)), compareFrom: isoDate(new Date(y, m - 2, 1)), compareTo: isoDate(new Date(y, m - 1, 0)),
      label: monthName(new Date(y, m - 1, 1)), vs: "vs the month before",
    };
  }
  if (p === "q") {
    return {
      from: isoDate(new Date(y, m - 3, 1)), to: isoDate(new Date(y, m, 0)), compareFrom: isoDate(new Date(y, m - 6, 1)), compareTo: isoDate(new Date(y, m - 3, 0)),
      label: "Last 3 full months", vs: "vs the 3 months before",
    };
  }
  const prevLen = new Date(y - 1, m + 1, 0).getDate();
  return {
    from: isoDate(new Date(y, 0, 1)), to: isoDate(today), compareFrom: isoDate(new Date(y - 1, 0, 1)), compareTo: isoDate(new Date(y - 1, m, Math.min(d, prevLen))),
    label: `${y} so far`, vs: "vs same period last year",
  };
}

export const PERIOD_OPTIONS: [Period, string][] = [["mtd", "This month"], ["last", "Last month"], ["q", "3 months"], ["ytd", "This year"]];

export const fmtInt = (n: number | null | undefined) => Math.round(Number(n) || 0).toLocaleString();
export const fmtDate = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
