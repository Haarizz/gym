/**
 * The one report model every GymBios report is described in. A page builds a ReportDocument from
 * the data it is already showing (same API calls, same filters, same branch), and the shared
 * engine turns it into an A4 PDF, a styled .xlsx workbook or a print layout. Nothing here fetches
 * data on its own, so an export can never show more (or other-branch) data than the screen.
 */

/** How a value is shown: money uses the gym's currency, percent expects percent units (12.5 = 12.5%). */
export type ValueFormat =
  | "text"
  | "money"
  | "number" // up to 2 decimals
  | "integer"
  | "decimal" // always 2 decimals, no currency
  | "percent"
  | "date"
  | "datetime"
  | "time"
  | "duration"; // minutes → "1h 25m"

export type DateLike = Date | string | number | null | undefined;
export type CellValue = string | number | boolean | Date | null | undefined;

export interface ReportColumn {
  key: string;
  header: string;
  format?: ValueFormat;
  align?: "left" | "center" | "right";
  /** Relative width hint (characters). Defaults from the header and the longest value. */
  width?: number;
  /** Totals row for this column (only used when the table has `totals`). A string is a fixed label. */
  total?: "sum" | "avg" | "count" | "min" | "max" | string;
  /** Long free text (notes, descriptions) — wraps instead of widening the column. */
  wrap?: boolean;
}

/** Row kinds beyond plain data: section headings span the table, subtotal/total rows are bold. */
export type RowKind = "data" | "section" | "subtotal" | "total" | "muted";

export type ReportRow = Record<string, CellValue> & { _kind?: RowKind };

export interface TableSection {
  kind: "table";
  title?: string;
  description?: string;
  /** Excel worksheet name (defaults to the title). */
  sheetName?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Adds a totals row from the columns' `total` rules (an Excel SUBTOTAL formula in the workbook). */
  totals?: boolean | { label?: string };
  emptyText?: string;
}

export interface KpiItem {
  label: string;
  value: CellValue;
  format?: ValueFormat;
  /** Small line under the value, e.g. "vs last month +12%" or "of 340 members". */
  hint?: string;
  tone?: "good" | "bad" | "neutral";
}

export interface KpiSection {
  kind: "kpis";
  title?: string;
  items: KpiItem[];
}

export interface KeyValueSection {
  kind: "keyValue";
  title?: string;
  items: { label: string; value: CellValue; format?: ValueFormat }[];
  /** Columns of label/value pairs in PDF/print (default 2). */
  columns?: number;
}

export type ChartType = "bar" | "stacked-bar" | "hbar" | "line" | "area" | "pie" | "donut";

export interface ChartSeries {
  name: string;
  values: (number | null | undefined)[];
  color?: string;
}

export interface ChartSpec {
  type: ChartType;
  /** X-axis categories (bar/line/area) or slice labels (pie/donut). */
  categories: string[];
  series: ChartSeries[];
  valueFormat?: ValueFormat;
  /** Per-slice colours for pie/donut, or per-bar colours for a single-series bar chart. */
  colors?: string[];
}

export interface ChartSection {
  kind: "chart";
  title?: string;
  description?: string;
  chart: ChartSpec;
  /** Relative height (1 = default ~ 0.42 × width). */
  height?: number;
}

export interface TextSection {
  kind: "text";
  title?: string;
  text: string;
}

export interface PageBreakSection {
  kind: "pageBreak";
}

export type ReportSection = TableSection | KpiSection | KeyValueSection | ChartSection | TextSection | PageBreakSection;

export interface ReportFilter {
  label: string;
  value: string | number | null | undefined;
}

export interface ReportDocument {
  title: string;
  subtitle?: string;
  /** Short report name used in the file name (defaults to the title). */
  fileName?: string;
  /** "auto" picks landscape for wide tables. */
  orientation?: "portrait" | "landscape" | "auto";
  period?: { from?: DateLike; to?: DateLike; label?: string };
  /** Overrides the active branch name (e.g. a document raised in another branch). */
  branchName?: string;
  /** Company header of this branch (defaults to the active branch). */
  companyBranchId?: number | null;
  filters?: ReportFilter[];
  sections: ReportSection[];
}

/** Everything the renderers need besides the report itself — resolved once per export. */
export interface ReportContext {
  company: ReportCompany;
  currencyCode: string;
  /** "AED " / "$" — plain text, never the on-screen Dirham glyph. */
  currencyPrefix: string;
  branchName: string;
  generatedAt: Date;
  generatedBy?: string;
}

export interface ReportCompany {
  name: string;
  nameLocal: string;
  address: string;
  phone: string;
  email: string;
  /** Only set when the branch is VAT registered (TRN + VAT switch on). */
  trn: string;
  logo: { dataUrl: string; width: number; height: number } | null;
}
