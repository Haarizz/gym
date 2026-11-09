import type {
  CellValue, ChartSection, ChartSpec, ChartType, KpiItem, KpiSection, ReportColumn, ReportRow, TableSection, ValueFormat,
} from "./types";

/** Column definition shorthand: col("amount", "Amount", "money", { total: "sum" }). */
export function col(key: string, header: string, format: ValueFormat = "text", extra: Partial<ReportColumn> = {}): ReportColumn {
  return { key, header, format, ...extra };
}

/** Money column that totals by default. */
export const moneyCol = (key: string, header: string, extra: Partial<ReportColumn> = {}) => col(key, header, "money", { total: "sum", ...extra });
/** Integer count column that totals by default. */
export const countCol = (key: string, header: string, extra: Partial<ReportColumn> = {}) => col(key, header, "integer", { total: "sum", ...extra });

export function tableSection(
  title: string | undefined,
  columns: ReportColumn[],
  /** Any row objects (interfaces welcome): only the columns' keys are read. */
  rows: readonly object[],
  opts: Partial<Omit<TableSection, "kind" | "columns" | "rows" | "title">> = {},
): TableSection {
  return { kind: "table", title, columns, rows: rows as ReportRow[], ...opts };
}

/** Maps any objects to report rows with an accessor per column key. */
export function rowsOf<T>(items: T[], map: (item: T, index: number) => Record<string, CellValue>): ReportRow[] {
  return items.map((it, i) => map(it, i));
}

export function kpiSection(items: (KpiItem | null | undefined | false)[], title?: string): KpiSection {
  return { kind: "kpis", title, items: items.filter(Boolean) as KpiItem[] };
}

export function chartSection(
  title: string,
  type: ChartType,
  categories: string[],
  series: ChartSpec["series"],
  opts: { valueFormat?: ValueFormat; colors?: string[]; description?: string; height?: number } = {},
): ChartSection {
  return {
    kind: "chart",
    title,
    description: opts.description,
    height: opts.height,
    chart: { type, categories, series, valueFormat: opts.valueFormat, colors: opts.colors },
  };
}

/** Pie / donut from {label, value} items. */
export function pieSection(
  title: string,
  items: { label: string; value: number; color?: string }[],
  opts: { valueFormat?: ValueFormat; donut?: boolean; seriesName?: string; description?: string } = {},
): ChartSection {
  const list = items.filter((i) => Number.isFinite(i.value));
  return chartSection(title, opts.donut === false ? "pie" : "donut", list.map((i) => i.label), [{ name: opts.seriesName ?? title, values: list.map((i) => i.value) }], {
    valueFormat: opts.valueFormat,
    colors: list.some((i) => i.color) ? list.map((i, n) => i.color || ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#d9a21b", "#d14d8a", "#2a9fb8", "#8a8780"][n % 8]) : undefined,
    description: opts.description,
  });
}

/** Bar/line/area chart from row objects: one category key, one series per value key. */
export function chartFromRows<T extends Record<string, any>>(
  title: string,
  type: ChartType,
  rows: T[],
  categoryKey: keyof T | ((row: T) => string),
  series: { key: keyof T | ((row: T) => number); name: string; color?: string }[],
  opts: { valueFormat?: ValueFormat; description?: string; height?: number; colors?: string[] } = {},
): ChartSection {
  const cat = (r: T) => String(typeof categoryKey === "function" ? categoryKey(r) : r[categoryKey] ?? "");
  return chartSection(
    title,
    type,
    rows.map(cat),
    series.map((s) => ({
      name: s.name,
      color: s.color,
      values: rows.map((r) => {
        const v = typeof s.key === "function" ? s.key(r) : r[s.key];
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : null;
      }),
    })),
    opts,
  );
}

/** "12.5%" style change hint for KPI cards. */
export function changeHint(pct: number | null | undefined, suffix = "vs previous period"): Pick<KpiItem, "hint" | "tone"> {
  if (pct == null || !Number.isFinite(pct)) return {};
  const r = Math.round(pct * 10) / 10;
  return { hint: `${r > 0 ? "+" : ""}${r}% ${suffix}`, tone: r > 0 ? "good" : r < 0 ? "bad" : "neutral" };
}

/**
 * Turns an on-screen display string back into a typed value: "⃃12,400" / "AED 12,400" / "$1.2K"
 * → money, "93.5%" → percent, "1,204" → integer. Anything else stays text. Lets pages hand over the
 * KPI strings they already render while Excel still receives real numbers.
 */
export function displayValue(display: string | number | null | undefined): Pick<KpiItem, "value" | "format"> {
  if (display == null) return { value: null, format: "text" };
  if (typeof display === "number") return { value: display, format: Number.isInteger(display) ? "integer" : "number" };
  const s = display.trim();
  const compact = /^(-?[\d.,]+)\s*([KMB])$/i;
  const scale = (m: RegExpExecArray) => Number(m[1].replace(/,/g, "")) * ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[m[2].toLowerCase()];
  const money = /^(-)?\s*(?:\u20C3|AED|SAR|INR|USD|EUR|GBP|[$₹€£])\s*(-)?\s*([\d.,]+\s*[KMB]?)$/i.exec(s);
  if (money) {
    const body = money[3].replace(/\s+/g, "");
    const c = compact.exec(body);
    const n = c ? scale(c) : Number(body.replace(/,/g, ""));
    if (Number.isFinite(n)) return { value: money[1] || money[2] ? -n : n, format: "money" };
  }
  const pct = /^([+-]?[\d.,]+)\s*%$/.exec(s);
  if (pct) return { value: Number(pct[1].replace(/,/g, "")), format: "percent" };
  if (/^-?[\d,]+$/.test(s)) return { value: Number(s.replace(/,/g, "")), format: "integer" };
  if (/^-?[\d,]*\.\d+$/.test(s)) return { value: Number(s.replace(/,/g, "")), format: "number" };
  return { value: s, format: "text" };
}

/** KPI item from an on-screen tile: label, display string, optional % change. */
export function kpiFromDisplay(label: string, display: string | number | null | undefined, change?: number | null, hint?: string, invert = false): KpiItem {
  const ch = changeHint(change);
  const tone = ch.tone && invert ? (ch.tone === "good" ? "bad" : ch.tone === "bad" ? "good" : ch.tone) : ch.tone;
  return { label, ...displayValue(display), hint: ch.hint ?? hint, tone };
}

const MONEY_HEADER = /amount|revenue|salary|paid|due|balance|price|cost|value|total|fee|debit|credit|collection|income|expense|payable|receivable|net|gross|vat|tax|commission|deduction|allowance|bonus|advance|refund|discount|spend|budget|profit|loss|sales|purchase|\((aed|inr|usd|eur|gbp|sar|\$|₹|€|£)\)/i;
const COUNT_HEADER = /count|qty|quantity|members|visits|sessions|days|#|no\.|number|units|stock|leads|check-?ins|hours|attendance/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

/**
 * Table section from a header row + row arrays (the shape the old CSV exporters already build).
 * Column types are inferred: amounts under money-like headers → money, other numbers → number/integer,
 * "12%" strings → percent, ISO dates → date. `totals` sums the money and count columns.
 */
export function tableFromMatrix(
  title: string | undefined,
  header: string[],
  rows: unknown[][],
  opts: { totals?: boolean; money?: number[]; noMoney?: number[]; wrap?: number[]; description?: string; sheetName?: string; emptyText?: string } = {},
): TableSection {
  const clean = rows.map((r) => r.map((v) => (v === undefined ? null : v)));
  const columns: ReportColumn[] = header.map((h, i) => {
    const vals = clean.map((r) => r[i]).filter((v) => v !== null && v !== "" && v !== "—" && v !== "-");
    const nums = vals.filter((v) => typeof v === "number" || (typeof v === "string" && /^-?[\d,]+(\.\d+)?$/.test(v.trim())));
    const allNum = vals.length > 0 && nums.length === vals.length;
    const pct = vals.length > 0 && vals.every((v) => typeof v === "string" && /^-?[\d.,]+\s*%$/.test(v.trim()));
    const dates = vals.length > 0 && vals.every((v) => v instanceof Date || (typeof v === "string" && ISO_DATE.test(v.trim())));
    let format: ValueFormat = "text";
    if (opts.money?.includes(i)) format = "money";
    else if (pct) format = "percent";
    else if (dates) format = "date";
    else if (allNum) {
      const asNum = nums.map((v) => (typeof v === "number" ? v : Number(String(v).replace(/,/g, ""))));
      if (!opts.noMoney?.includes(i) && MONEY_HEADER.test(h) && !COUNT_HEADER.test(h)) format = "money";
      else format = asNum.every(Number.isInteger) ? "integer" : "number";
    }
    const total = opts.totals && (format === "money" || (format === "integer" && COUNT_HEADER.test(h) && !/#|no\.|id/i.test(h))) ? "sum" : undefined;
    return { key: `c${i}`, header: h, format, total, wrap: opts.wrap?.includes(i) };
  });
  const out: ReportRow[] = clean.map((r) => {
    const row: ReportRow = {};
    r.forEach((v, i) => {
      const fmt = columns[i]?.format;
      if (fmt === "percent" && typeof v === "string") row[`c${i}`] = Number(v.replace(/[%,\s]/g, ""));
      else if ((fmt === "money" || fmt === "integer" || fmt === "number") && typeof v === "string" && /^-?[\d,]+(\.\d+)?$/.test(v.trim())) row[`c${i}`] = Number(v.replace(/,/g, ""));
      else row[`c${i}`] = v as CellValue;
    });
    return row;
  });
  return { kind: "table", title, description: opts.description, sheetName: opts.sheetName, columns, rows: out, totals: opts.totals, emptyText: opts.emptyText };
}
