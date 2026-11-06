import type { CellValue, DateLike, ReportColumn, ReportContext, ReportDocument, ValueFormat } from "./types";

/** On-screen strings may carry the Dirham glyph (U+20C3), which no export font has — spell it out. */
export const plainText = (s: string) => (s.includes("\u20C3") ? s.replace(/\u20C3\s?/g, "AED ") : s);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses Date / ISO string / epoch ms. "2026-11-06" is read as a local calendar date, not UTC midnight. */
export function toDate(value: DateLike): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 06 Nov 2026 */
export function formatDate(value: DateLike): string {
  const d = toDate(value);
  return d ? `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
}

/** 06 Nov 2026, 02:35 PM */
export function formatDateTime(value: DateLike): string {
  const d = toDate(value);
  return d ? `${formatDate(d)}, ${formatTime(d)}` : "";
}

export function formatTime(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "";
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

/** 2026-11-06 — for file names. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toNumber(value: CellValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return null;
  const n = Number(String(value).replace(/[^0-9.eE+\-]/g, ""));
  return Number.isFinite(n) && /\d/.test(String(value)) ? n : null;
}

const NUMERIC_FORMATS: ValueFormat[] = ["money", "number", "integer", "decimal", "percent", "duration"];
export const isNumericFormat = (f?: ValueFormat) => !!f && NUMERIC_FORMATS.includes(f);

function grouped(n: number, minFrac: number, maxFrac: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
}

/** Display text for PDF and print. Strings pass through unchanged (they are already display text). */
export function formatValue(value: CellValue, format: ValueFormat | undefined, ctx: Pick<ReportContext, "currencyPrefix">): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && format !== "text" && format && !/\d/.test(value)) return plainText(value); // "—", "N/A"
  switch (format) {
    case "money": {
      const n = toNumber(value);
      if (n == null) return String(value);
      const sign = n < 0 ? "-" : "";
      return `${sign}${ctx.currencyPrefix}${grouped(Math.abs(n), 2, 2)}`;
    }
    case "decimal": {
      const n = toNumber(value);
      return n == null ? String(value) : grouped(n, 2, 2);
    }
    case "number": {
      const n = toNumber(value);
      return n == null ? String(value) : grouped(n, 0, 2);
    }
    case "integer": {
      const n = toNumber(value);
      return n == null ? String(value) : grouped(Math.round(n), 0, 0);
    }
    case "percent": {
      const n = toNumber(value);
      return n == null ? String(value) : `${grouped(n, 0, 1)}%`;
    }
    case "duration": {
      const n = toNumber(value);
      if (n == null) return String(value);
      const h = Math.floor(Math.abs(n) / 60);
      const m = Math.round(Math.abs(n) % 60);
      return h ? `${h}h ${pad(m)}m` : `${m}m`;
    }
    case "date":
      return value instanceof Date || typeof value === "string" || typeof value === "number" ? formatDate(value) || String(value) : String(value);
    case "datetime":
      return value instanceof Date || typeof value === "string" || typeof value === "number" ? formatDateTime(value) || String(value) : String(value);
    case "time":
      return value instanceof Date || typeof value === "string" || typeof value === "number" ? formatTime(value) || String(value) : String(value);
    default:
      if (value instanceof Date) return formatDate(value);
      if (typeof value === "number") return grouped(value, 0, 2);
      return plainText(String(value));
  }
}

/** Compact axis label: 12.5K / AED 1.2M / 40%. */
export function formatCompact(n: number, format: ValueFormat | undefined, ctx: Pick<ReportContext, "currencyPrefix">): string {
  if (format === "percent") return `${grouped(n, 0, 1)}%`;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e9) s = `${grouped(n / 1e9, 0, 1)}B`;
  else if (abs >= 1e6) s = `${grouped(n / 1e6, 0, 1)}M`;
  else if (abs >= 1e3) s = `${grouped(n / 1e3, 0, 1)}K`;
  else s = grouped(n, 0, format === "integer" ? 0 : 1);
  return format === "money" ? `${ctx.currencyPrefix}${s}` : s;
}

export function columnAlign(col: ReportColumn): "left" | "center" | "right" {
  if (col.align) return col.align;
  return isNumericFormat(col.format) ? "right" : "left";
}

/** "01 Nov 2026 – 30 Nov 2026" / the label / "" */
export function periodText(report: ReportDocument): string {
  const p = report.period;
  if (!p) return "";
  const from = formatDate(p.from);
  const to = formatDate(p.to);
  const range = from && to ? (from === to ? from : `${from} – ${to}`) : from ? `From ${from}` : to ? `Up to ${to}` : "";
  if (p.label && range && !p.label.includes(range)) return `${p.label} (${range})`;
  return p.label || range;
}

/** Report information lines shown under the title: period, branch, filters, generated. */
export function reportInfo(report: ReportDocument, ctx: ReportContext): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const period = periodText(report);
  if (period) rows.push({ label: "Period", value: period });
  rows.push({ label: "Branch", value: report.branchName || ctx.branchName });
  for (const f of report.filters ?? []) {
    if (f.value == null || f.value === "") continue;
    rows.push({ label: f.label, value: String(f.value) });
  }
  rows.push({ label: "Generated", value: formatDateTime(ctx.generatedAt) + (ctx.generatedBy ? ` by ${ctx.generatedBy}` : "") });
  return rows;
}

/** Computes the totals row of a table section from its columns' rules (data rows only). */
export function computeTotals(columns: ReportColumn[], rows: { [k: string]: CellValue; _kind?: string }[], label = "Total"): Record<string, CellValue> {
  const data = rows.filter((r) => !r._kind || r._kind === "data" || r._kind === "muted");
  const out: Record<string, CellValue> = {};
  columns.forEach((c, i) => {
    const rule = c.total;
    if (!rule) {
      if (i === 0) out[c.key] = label;
      return;
    }
    const nums = data.map((r) => toNumber(r[c.key])).filter((n): n is number => n != null);
    switch (rule) {
      case "sum": out[c.key] = round2(nums.reduce((s, n) => s + n, 0)); break;
      case "avg": out[c.key] = nums.length ? round2(nums.reduce((s, n) => s + n, 0) / nums.length) : null; break;
      case "count": out[c.key] = data.filter((r) => r[c.key] != null && r[c.key] !== "").length; break;
      case "min": out[c.key] = nums.length ? Math.min(...nums) : null; break;
      case "max": out[c.key] = nums.length ? Math.max(...nums) : null; break;
      default: out[c.key] = rule;
    }
  });
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** PowerGym_Revenue_Report_2026-11-06 */
export function buildFileName(report: ReportDocument, ctx: ReportContext, ext: "pdf" | "xlsx"): string {
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "_");
  const company = clean(ctx.company.name) || "GymBios";
  let name = clean(report.fileName || report.title) || "Report";
  if (!/report|statement|summary|analytics|overview|ledger|register|history|log/i.test(name)) name += "_Report";
  return `${company}_${name}_${isoDay(ctx.generatedAt)}.${ext}`;
}

/** True when a report has nothing to show (every table empty, no KPIs/charts/text). */
export function isEmptyReport(report: ReportDocument): boolean {
  return !report.sections.some((s) => {
    if (s.kind === "table") return s.rows.length > 0;
    if (s.kind === "kpis") return s.items.length > 0;
    if (s.kind === "keyValue") return s.items.length > 0;
    if (s.kind === "chart") return hasChartData(s.chart);
    if (s.kind === "text") return !!s.text.trim();
    return false;
  });
}

export function hasChartData(chart: { categories: string[]; series: { values: (number | null | undefined)[] }[] }): boolean {
  return chart.categories.length > 0 && chart.series.some((s) => s.values.some((v) => typeof v === "number" && v !== 0));
}

/** Wide tables print landscape. */
export function resolveOrientation(report: ReportDocument): "portrait" | "landscape" {
  if (report.orientation && report.orientation !== "auto") return report.orientation;
  const widest = Math.max(0, ...report.sections.map((s) => (s.kind === "table" ? tableWeight(s.columns, s.rows) : 0)));
  return widest > 112 ? "landscape" : "portrait";
}

/** Rough printed width of a table in characters, from its real (sampled) values. */
function tableWeight(cols: ReportColumn[], rows: Record<string, CellValue>[]): number {
  const sample = rows.length > 200 ? rows.filter((_, i) => i % Math.ceil(rows.length / 200) === 0) : rows;
  const ctx = { currencyPrefix: "AED " };
  return cols.reduce((sum, c) => {
    const longest = Math.max(0, ...sample.map((r) => formatValue(r[c.key], c.format, ctx).length));
    const head = Math.max(...c.header.split(/\s+/).map((w) => w.length));
    const w = c.width ?? Math.min(c.wrap ? 26 : 30, Math.max(longest, head));
    return sum + w + 2.5;
  }, 0);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
