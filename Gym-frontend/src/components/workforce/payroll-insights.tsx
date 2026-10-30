import React, { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import {
  AlertTriangle, ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, CheckCircle2, ChevronRight, Info, Minus, XCircle,
} from "lucide-react";
import { buildXlsx, downloadBlob, type XlsxCell } from "../../utils/xlsx-export";
import { exportAsCsv } from "../../utils/export-utils";
import { printHtml } from "../../utils/print-html";
import { addMonths, monthsBetween, ym } from "../../utils/supabase/payroll-report-service";
import styles from "./payroll-insights.module.css";

/** Shared pieces for Payroll Analytics and Payroll Reports (see payroll-insights.module.css). */

export { styles as pi };

// ── Colors: validated dataviz categorical slots 1–4, fixed order; dark steps selected ──

const LIGHT = {
  basic: "#2a78d6", allowances: "#eb6834", overtime: "#1baf7a", commission: "#eda100",
  net: "#2a78d6", compare: "#a8a69f", grid: "#e9e8e3", axis: "#898781", surface: "#ffffff",
  issued: "#2a78d6", recovered: "#eb6834",
};
const DARK = {
  basic: "#3987e5", allowances: "#d95926", overtime: "#199e70", commission: "#c98500",
  net: "#3987e5", compare: "#6f6d67", grid: "#2c2c2a", axis: "#898781", surface: "#262626",
  issued: "#3987e5", recovered: "#d95926",
};
export type Palette = typeof LIGHT;

/** Chart colors for the current theme (the app toggles a .dark class on <html>). */
export function usePayrollPalette(): Palette {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

export const EARNING_PARTS = [
  { key: "basic", label: "Basic salary" },
  { key: "allowances", label: "Allowances" },
  { key: "overtime", label: "Overtime" },
  { key: "commission", label: "Commission" },
] as const;
export type EarningKey = (typeof EARNING_PARTS)[number]["key"];

// ── Periods (whole months) ──────────────────────────────────────────────────

export type Preset = "this-month" | "last-month" | "last-3" | "last-6" | "this-year" | "last-12" | "last-year" | "custom";
export type CompareMode = "previous" | "year";

export const PRESETS: { id: Preset; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3", label: "Last 3 months" },
  { id: "last-6", label: "Last 6 months" },
  { id: "this-year", label: "This year" },
  { id: "last-12", label: "Last 12 months" },
  { id: "last-year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

export interface MonthRange { from: string; to: string }

export function presetRange(preset: Preset, custom: MonthRange): MonthRange {
  const now = ym(new Date());
  switch (preset) {
    case "this-month": return { from: now, to: now };
    case "last-month": { const m = addMonths(now, -1); return { from: m, to: m }; }
    case "last-3": return { from: addMonths(now, -2), to: now };
    case "last-6": return { from: addMonths(now, -5), to: now };
    case "this-year": return { from: `${now.slice(0, 4)}-01`, to: now };
    case "last-12": return { from: addMonths(now, -11), to: now };
    case "last-year": { const y = Number(now.slice(0, 4)) - 1; return { from: `${y}-01`, to: `${y}-12` }; }
    default: {
      const from = custom.from || now, to = custom.to || now;
      return from > to ? { from: to, to: from } : { from, to };
    }
  }
}

/** The same number of months just before, or the same months a year earlier. */
export function compareRange(r: MonthRange, mode: CompareMode): MonthRange {
  if (mode === "year") return { from: addMonths(r.from, -12), to: addMonths(r.to, -12) };
  const n = monthsBetween(r.from, r.to);
  return { from: addMonths(r.from, -n), to: addMonths(r.from, -1) };
}

export function PeriodFilter({ preset, onPreset, custom, onCustom, children }: {
  preset: Preset; onPreset: (p: Preset) => void; custom: MonthRange; onCustom: (r: MonthRange) => void; children?: React.ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.filters}`}>
      <div className={styles.chips} role="tablist" aria-label="Period">
        {PRESETS.map(p => (
          <button key={p.id} type="button" role="tab" aria-selected={preset === p.id} className={styles.chip}
            data-active={preset === p.id} onClick={() => onPreset(p.id)}>{p.label}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div className={styles.customRange}>
          <input type="month" className={styles.monthInput} aria-label="From month" value={custom.from}
            max={custom.to || undefined} onChange={e => onCustom({ ...custom, from: e.target.value })} />
          <span className={styles.filterLabel}>to</span>
          <input type="month" className={styles.monthInput} aria-label="To month" value={custom.to}
            min={custom.from || undefined} onChange={e => onCustom({ ...custom, to: e.target.value })} />
        </div>
      )}
      {children && <div className={styles.filterEnd}>{children}</div>}
    </div>
  );
}

// ── Small pieces ────────────────────────────────────────────────────────────

export const fmtPct = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) ? "—" : `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
export const fmtNum = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n) ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
export const compactNumber = (n: number) => Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Change vs the comparison period; `upIsGood` false for costs. */
export function Delta({ pct, upIsGood = false, neutral }: { pct: number | null | undefined; upIsGood?: boolean; neutral?: boolean }) {
  if (pct == null || Number.isNaN(pct)) return <span className={styles.delta} data-tone="flat" title="Nothing to compare with"><Minus size={12} />new</span>;
  if (Math.abs(pct) < 0.05) return <span className={styles.delta} data-tone="flat"><Minus size={12} />0%</span>;
  const up = pct > 0;
  const good = up === upIsGood;
  return (
    <span className={styles.delta} data-tone={neutral ? "flat" : good ? "good" : "bad"}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
    </span>
  );
}

type IconT = React.ComponentType<{ size?: number; className?: string }>;

export function HeroKpi({ icon: Icon, tone, label, value, delta, foot, spark, sparkColor }: {
  icon: IconT; tone: string; label: string; value: string; delta?: React.ReactNode; foot?: React.ReactNode;
  spark?: number[]; sparkColor?: string;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
      </div>
      <div className={styles.kpiValue} title={value}>{value}</div>
      <div className={styles.kpiFoot}>{delta}{foot && <span>{foot}</span>}</div>
      {spark && spark.length > 1 && (
        <div className={styles.spark} aria-hidden>
          <ResponsiveContainer>
            <LineChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
              <Line type="linear" dataKey="v" stroke={sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function SmallKpi({ icon: Icon, tone, label, value, hint }: {
  icon: IconT; tone: string; label: string; value: string; hint?: React.ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone} style={{ width: "1.75rem", height: "1.75rem" }}><Icon size={14} /></span>
      </div>
      <div className={styles.kpiValueSm} title={value}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
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

/** Recharts tooltip; `total` adds a summed row (stacked charts). */
export function ChartTip({ active, payload, label, money, total, format }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value != null);
  const fmt = (v: number) => (format ? format(v) : money(v));
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {rows.map((p: any) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipKey}>
            <span className={styles.swatch} style={{ ["--sw" as any]: p.color || p.stroke || p.fill }} />{p.name}
          </span>
          <span className={styles.tooltipVal}>{fmt(p.value)}</span>
        </div>
      ))}
      {total && rows.length > 1 && (
        <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
          <span className={styles.tooltipKey}>{total}</span>
          <span className={styles.tooltipVal}>{fmt(rows.reduce((s: number, p: any) => s + Number(p.value || 0), 0))}</span>
        </div>
      )}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
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

export interface BarRowItem { key: string; label: React.ReactNode; value: number; display: string; meta?: React.ReactNode; color?: string; title?: string }

export function BarRows({ rows, color, empty }: { rows: BarRowItem[]; color: string; empty: React.ReactNode }) {
  if (!rows.length) return <div className={styles.empty}>{empty}</div>;
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 1);
  return (
    <div className={styles.barRows}>
      {rows.map(r => (
        <div key={r.key} className={styles.barRow}>
          <span className={styles.barName} title={r.title}>{r.label}</span>
          <span className={styles.barVal}>{r.display}</span>
          <div className={styles.barTrack}>
            <div className={styles.track}><div className={styles.fill} style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, ["--fill" as any]: r.color ?? color }} /></div>
            {r.meta != null && <span className={styles.barMeta}>{r.meta}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export const initialsOf = (name?: string | null) =>
  (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join("") || "?";

export function PersonCell({ name, sub }: { name: string; sub?: React.ReactNode }) {
  return (
    <div className={styles.person}>
      <span className={styles.avatar}>{initialsOf(name)}</span>
      <div className={styles.stackCol}>
        <span className={styles.personName}>{name}</span>
        {sub && <span className={styles.personSub}>{sub}</span>}
      </div>
    </div>
  );
}

export type InsightType = "positive" | "info" | "warning" | "critical";
export interface InsightItem { type: InsightType; rank: number; title: string; detail: string }

const INSIGHT_META: Record<InsightType, { label: string; icon: IconT }> = {
  positive: { label: "Good", icon: CheckCircle2 },
  info: { label: "Note", icon: Info },
  warning: { label: "Watch", icon: AlertTriangle },
  critical: { label: "Act now", icon: XCircle },
};

export function Insights({ items }: { items: InsightItem[] }) {
  if (!items.length) return <div className={styles.empty}><CheckCircle2 size={22} />Nothing stands out for this period.</div>;
  return (
    <div className={styles.insights}>
      {[...items].sort((a, b) => a.rank - b.rank).map((i, n) => {
        const meta = INSIGHT_META[i.type];
        return (
          <div key={n} className={styles.insight} data-type={i.type}>
            <span className={styles.insightIcon}><meta.icon size={15} /></span>
            <div>
              <div className={styles.insightTag}>{meta.label}</div>
              <div className={styles.insightTitle}>{i.title}</div>
              <div className={styles.insightDetail}>{i.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Report table ────────────────────────────────────────────────────────────

export type ColKind = "money" | "number" | "hours" | "percent" | "text";

export interface Col<T> {
  key: string;
  label: string;
  /** Raw value: sorting, totals and export. */
  value: (r: T) => string | number | null | undefined;
  /** On-screen cell; defaults to the formatted value. */
  render?: (r: T) => React.ReactNode;
  kind?: ColKind;
  /** true = sum of the column; a function for anything else (e.g. an average). */
  total?: boolean | ((rows: T[]) => number | string | null);
  /** Leave the column out on screen (still exported) / out of exports. */
  exportOnly?: boolean;
  screenOnly?: boolean;
  /** money cells: green "+" / red "−" */
  sign?: "+" | "-";
  className?: string;
}

const isNumeric = (k?: ColKind) => k === "money" || k === "number" || k === "hours" || k === "percent";

export function formatCell(kind: ColKind | undefined, v: unknown, money: (n: number) => string): string {
  if (v == null || v === "") return "—";
  if (kind === "money") return money(Number(v));
  if (kind === "hours") return `${fmtNum(Number(v))}h`;
  if (kind === "percent") return fmtPct(Number(v));
  if (kind === "number") return fmtNum(Number(v), 2);
  return String(v);
}

export function columnTotal<T>(c: Col<T>, rows: T[]): number | string | null {
  if (!c.total) return null;
  if (typeof c.total === "function") return c.total(rows);
  return rows.reduce((s, r) => s + (Number(c.value(r)) || 0), 0);
}

export function ReportTable<T>({ columns, rows, rowKey, money, totalLabel = "Total", initialSort, expand, limit = 100, empty }: {
  columns: Col<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  money: (n: number) => string;
  totalLabel?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  expand?: (r: T) => React.ReactNode;
  limit?: number;
  empty?: React.ReactNode;
}) {
  const cols = columns.filter(c => !c.exportOnly);
  const [sort, setSort] = useState(initialSort ?? null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [rows]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = columns.find(x => x.key === sort.key);
    if (!c) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = c.value(a), y = c.value(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
    });
  }, [rows, sort, columns]);

  const visible = showAll ? sorted : sorted.slice(0, limit);
  const hasTotals = cols.some(c => c.total);
  const toggleSort = (c: Col<T>) => setSort(s => s?.key === c.key
    ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
    : { key: c.key, dir: isNumeric(c.kind) ? "desc" : "asc" });

  if (!rows.length) return <div className={styles.empty}>{empty ?? "No rows for these filters."}</div>;

  const cellFor = (c: Col<T>, r: T) => {
    if (c.render) return c.render(r);
    const v = c.value(r);
    if (c.kind === "money" && c.sign && Number(v)) {
      return <span className={c.sign === "+" ? styles.plus : styles.minus}>{c.sign === "+" ? "+" : "−"}{money(Math.abs(Number(v)))}</span>;
    }
    if (c.kind === "money" && !Number(v)) return <span className={styles.muted}>—</span>;
    return formatCell(c.kind, v, money);
  };

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {expand && <th style={{ width: "2rem" }} aria-label="Details" />}
              {cols.map(c => (
                <th key={c.key} className={`${isNumeric(c.kind) ? styles.num : ""} ${styles.th}`} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                  <button type="button" className={styles.sortBtn} data-active={sort?.key === c.key} onClick={() => toggleSort(c)}>
                    {c.label}
                    {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const k = rowKey(r);
              const isOpen = open.has(k);
              return (
                <React.Fragment key={k}>
                  <tr className={expand ? styles.clickRow : undefined}
                    onClick={expand ? () => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; }) : undefined}>
                    {expand && <td><ChevronRight size={14} className={styles.chev} data-open={isOpen} /></td>}
                    {cols.map(c => (
                      <td key={c.key} className={`${isNumeric(c.kind) ? styles.num : ""} ${c.className ?? ""}`}>{cellFor(c, r)}</td>
                    ))}
                  </tr>
                  {expand && isOpen && (
                    <tr><td colSpan={cols.length + 1} className={styles.expandCell}>{expand(r)}</td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr>
                {expand && <td />}
                {cols.map((c, i) => {
                  const t = columnTotal(c, rows);
                  return (
                    <td key={c.key} className={isNumeric(c.kind) ? styles.num : ""}>
                      {i === 0 ? `${totalLabel} (${rows.length})` : t == null ? "" : typeof t === "number" ? formatCell(c.kind, t, money) : t}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {sorted.length > limit && (
        <div className={styles.more}>
          <button type="button" className={styles.chip} onClick={() => setShowAll(v => !v)}>
            {showAll ? "Show fewer" : `Show all ${sorted.length} rows`}
          </button>
        </div>
      )}
    </>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────

export interface ExportSpec<T> {
  title: string;
  subtitle: string;
  filename: string;
  columns: Col<T>[];
  rows: T[];
  currencyCode: string;
  /** plain-text money for print (no app font guarantee) */
  moneyText: (n: number) => string;
  totalLabel?: string;
}

const exportCols = <T,>(cols: Col<T>[]) => cols.filter(c => !c.screenOnly);
const round2 = (n: number) => Math.round(n * 100) / 100;

function rawCell<T>(c: Col<T>, r: T): XlsxCell {
  const v = c.value(r);
  if (v == null) return "";
  return isNumeric(c.kind) ? round2(Number(v)) : String(v);
}

function totalsRow<T>(cols: Col<T>[], rows: T[], label: string): XlsxCell[] | null {
  if (!cols.some(c => c.total)) return null;
  return cols.map((c, i) => {
    if (i === 0) return label;
    const t = columnTotal(c, rows);
    return t == null ? "" : typeof t === "number" ? round2(t) : t;
  });
}

export function exportXlsx<T>(s: ExportSpec<T>) {
  const cols = exportCols(s.columns);
  const header = cols.map(c => c.kind === "money" ? `${c.label} (${s.currencyCode})` : c.label);
  const body = s.rows.map(r => cols.map(c => rawCell(c, r)));
  const total = totalsRow(cols, s.rows, s.totalLabel ?? "Total");
  const rows: XlsxCell[][] = [[s.title], [s.subtitle], [], header, ...body, ...(total ? [total] : [])];
  const blob = buildXlsx(s.title, rows, {
    boldRows: [0, 3, ...(total ? [rows.length - 1] : [])],
    moneyColumns: cols.map((c, i) => (c.kind === "money" ? i : -1)).filter(i => i >= 0),
    columnWidths: cols.map(c => (c.kind === "text" || !c.kind ? 24 : 15)),
  });
  downloadBlob(blob, `${s.filename}.xlsx`);
}

export function exportCsv<T>(s: ExportSpec<T>) {
  const cols = exportCols(s.columns);
  const header = cols.map(c => c.kind === "money" ? `${c.label} (${s.currencyCode})` : c.label);
  const body: unknown[][] = s.rows.map(r => cols.map(c => rawCell(c, r)));
  const total = totalsRow(cols, s.rows, s.totalLabel ?? "Total");
  exportAsCsv(`${s.filename}.csv`, header, total ? [...body, total] : body);
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function printReport<T>(s: ExportSpec<T>, extraHtml = "") {
  const cols = exportCols(s.columns);
  const cell = (c: Col<T>, v: unknown) => (isNumeric(c.kind) ? formatCell(c.kind, v, s.moneyText) : esc(v ?? "—"));
  const total = cols.some(c => c.total)
    ? `<tfoot><tr>${cols.map((c, i) => {
      const t = columnTotal(c, s.rows);
      return `<td class="${isNumeric(c.kind) ? "n" : ""}">${i === 0 ? esc(s.totalLabel ?? "Total") : t == null ? "" : typeof t === "number" ? cell(c, t) : esc(t)}</td>`;
    }).join("")}</tr></tfoot>`
    : "";
  const landscape = cols.length > 7;
  printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.title)}</title><style>
    @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:12mm}
    body{color:#0b0b0b;font-size:10.5px;margin:0}
    h1{font-size:17px;margin:0}.sub{color:#52514e;margin:3px 0 14px}
    table{width:100%;border-collapse:collapse}th,td{padding:5px 6px;border-bottom:1px solid #e1e0d9;text-align:left;vertical-align:top}
    th{color:#52514e;font-weight:600;background:#f4f3ef}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    tfoot td{font-weight:700;border-top:2px solid #0b0b0b;border-bottom:0}
    h2{font-size:13px;margin:18px 0 6px}</style></head><body>
    <h1>${esc(s.title)}</h1><div class="sub">${esc(s.subtitle)}</div>
    ${extraHtml}
    <table><thead><tr>${cols.map(c => `<th class="${isNumeric(c.kind) ? "n" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead>
    <tbody>${s.rows.map(r => `<tr>${cols.map(c => `<td class="${isNumeric(c.kind) ? "n" : ""}">${cell(c, c.value(r))}</td>`).join("")}</tr>`).join("")}</tbody>
    ${total}</table></body></html>`);
}
