import { buildWorkbook, colName, safeSheetName, XSheet, type XStyle, type XValue } from "../../utils/xlsx-workbook";
import { CHART_PALETTE } from "./chart-svg";
import { computeTotals, formatValue, isNumericFormat, plainText, reportInfo, resolveOrientation, toDate, toNumber } from "./format";
import { ACCENT_HEX, ACCENT_SOFT_HEX } from "./theme";
import type { CellValue, ChartSection, ReportColumn, ReportContext, ReportDocument, TableSection, ValueFormat } from "./types";

const ACCENT = ACCENT_HEX.replace("#", "");
const SOFT = ACCENT_SOFT_HEX.replace("#", "");

const S = {
  company: { bold: true, size: 14, color: ACCENT } as XStyle,
  companyLocal: { bold: true, size: 13, color: ACCENT, align: "left" } as XStyle,
  details: { size: 9, color: "6B7280" } as XStyle,
  title: { bold: true, size: 13, color: "111827" } as XStyle,
  info: { size: 9, color: "4B5563" } as XStyle,
  infoLabel: { size: 9, bold: true, color: "374151" } as XStyle,
  section: { bold: true, size: 11, color: ACCENT, border: "bottomMedium", borderColor: ACCENT } as XStyle,
  head: { bold: true, size: 10, color: "FFFFFF", fill: ACCENT, border: "box", borderColor: ACCENT, valign: "center", wrap: true } as XStyle,
  muted: { size: 9, italic: true, color: "6B7280" } as XStyle,
};

function moneyFormat(prefix: string): string {
  const p = prefix.replace(/"/g, "");
  return `"${p}"#,##0.00;-"${p}"#,##0.00`;
}

function numFmtFor(format: ValueFormat | undefined, ctx: ReportContext, integerOnly = false): string | undefined {
  switch (format) {
    case "money": return moneyFormat(ctx.currencyPrefix);
    case "integer": return "#,##0";
    case "number": return integerOnly ? "#,##0" : "#,##0.00";
    case "decimal": return "#,##0.00";
    case "percent": return "0.0%";
    case "date": return "dd mmm yyyy";
    case "datetime": return "dd mmm yyyy hh:mm AM/PM";
    case "time": return "hh:mm AM/PM";
    case "duration": return '#,##0" min"';
    default: return undefined;
  }
}

/** Typed cell value: real numbers, real dates, percent as a fraction. Unparseable values stay text. */
function typedValue(value: CellValue, format: ValueFormat | undefined): XValue {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (format === "date" || format === "datetime" || format === "time") {
    if (value instanceof Date || typeof value === "number" || typeof value === "string") {
      const d = toDate(value);
      if (d) return format === "date" ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : d;
    }
    return String(value);
  }
  if (isNumericFormat(format)) {
    if (typeof value === "string" && !/\d/.test(value)) return plainText(value); // "—", "N/A"
    const n = toNumber(value);
    if (n == null) return String(value);
    return format === "percent" ? n / 100 : n;
  }
  if (value instanceof Date) return value;
  return typeof value === "string" ? plainText(value) : (value as XValue);
}

const displayLen = (s: string) => Math.max(...s.split("\n").map((l) => l.length));

/** Company + report header block. Returns the next free row. */
function writeHeader(sheet: XSheet, report: ReportDocument, ctx: ReportContext, span: number, full: boolean, section?: string): number {
  const c = ctx.company;
  let r = 0;
  const line = (value: string, style: XStyle, height?: number) => {
    sheet.set(r, 0, { v: value, s: style });
    sheet.merge(r, 0, r, Math.max(0, span - 1));
    if (height) sheet.rowHeights.set(r, height);
    r++;
  };
  if (c.nameLocal) line(c.nameLocal, S.companyLocal, 20);
  if (c.name) line(c.name, S.company, 20);
  const details = [c.address, c.phone && `Phone: ${c.phone}`, c.email && `Email: ${c.email}`, c.trn && `TRN: ${c.trn}`].filter(Boolean).join("   |   ");
  if (details) line(details, S.details);
  if (full) {
    r++;
    line(report.title, S.title, 19);
    if (report.subtitle) line(report.subtitle, S.info);
  } else {
    // Table sheets keep the block compact, so the frozen pane above the data stays small.
    line([report.title, section && section !== report.title ? section : ""].filter(Boolean).join("  —  "), S.title, 19);
  }
  const info = reportInfo(report, ctx);
  if (full) {
    for (const i of info) {
      sheet.set(r, 0, { v: i.label, s: S.infoLabel });
      sheet.set(r, 1, { v: i.value, s: S.info });
      if (span > 2) sheet.merge(r, 1, r, span - 1);
      r++;
    }
  } else {
    line(info.map((i) => `${i.label}: ${i.value}`).join("   |   "), S.info);
  }
  return r + 1;
}

function writeTable(sheet: XSheet, section: TableSection, ctx: ReportContext, startRow: number, opts: { freeze: boolean; title: boolean }): number {
  const cols = section.columns;
  let r = startRow;
  if (opts.title && section.title) {
    sheet.set(r, 0, { v: section.title, s: S.section });
    for (let c = 1; c < cols.length; c++) sheet.set(r, c, { s: S.section });
    r++;
    if (section.description) { sheet.set(r, 0, { v: section.description, s: S.muted }); r++; }
  }
  const headRow = r;
  cols.forEach((col, c) => sheet.set(r, c, { v: col.header, s: { ...S.head, align: isNumericFormat(col.format) ? "right" : col.align ?? "left" } }));
  sheet.rowHeights.set(r, 20);
  r++;

  if (!section.rows.length) {
    sheet.set(r, 0, { v: section.emptyText || "No data available for the selected filters.", s: S.muted });
    sheet.merge(r, 0, r, Math.max(0, cols.length - 1));
    return r + 2;
  }

  const integerOnly = cols.map((col) => col.format === "number" && section.rows.every((row) => { const n = toNumber(row[col.key]); return n == null || Number.isInteger(n); }));
  const fmts = cols.map((col, i) => numFmtFor(col.format, ctx, integerOnly[i]));
  const firstData = r;
  const structured = section.rows.some((row) => row._kind && row._kind !== "data" && row._kind !== "muted");

  for (const row of section.rows) {
    const kind = row._kind ?? "data";
    if (kind === "section") {
      const label = row[cols[0].key];
      sheet.set(r, 0, { v: label == null ? "" : String(label), s: { bold: true, fill: "EEF2F1", color: "1F2937", border: "bottom", borderColor: "D5DBDB" } });
      for (let c = 1; c < cols.length; c++) {
        const v = row[cols[c].key];
        sheet.set(r, c, { v: v == null ? null : typedValue(v, cols[c].format), s: { bold: true, fill: "EEF2F1", border: "bottom", borderColor: "D5DBDB", numFmt: fmts[c] } });
      }
      r++;
      continue;
    }
    const bold = kind === "subtotal" || kind === "total";
    cols.forEach((col, c) => {
      const style: XStyle = {
        border: kind === "total" ? "topDouble" : kind === "subtotal" ? "top" : "bottom",
        borderColor: kind === "data" || kind === "muted" ? "E5E7EB" : "9CA3AF",
        numFmt: fmts[c],
        align: col.align ?? (isNumericFormat(col.format) ? "right" : undefined),
        ...(bold ? { bold: true, fill: kind === "total" ? SOFT : "F3F4F6" } : {}),
        ...(kind === "muted" ? { color: "6B7280", italic: true } : {}),
        ...(col.wrap ? { wrap: true, valign: "top" as const } : {}),
      };
      sheet.set(r, c, { v: typedValue(row[col.key], col.format), s: style });
    });
    r++;
  }
  const lastData = r - 1;

  if (section.totals) {
    const label = typeof section.totals === "object" && section.totals.label ? section.totals.label : "Total";
    const totals = computeTotals(cols, section.rows, label);
    const code: Record<string, number> = { sum: 109, avg: 101, count: 103, min: 105, max: 104 };
    cols.forEach((col, c) => {
      const style: XStyle = { bold: true, fill: SOFT, border: "topDouble", borderColor: ACCENT, numFmt: fmts[c], align: isNumericFormat(col.format) ? "right" : undefined };
      const rule = col.total;
      const fn = rule ? code[rule] : undefined;
      if (fn && lastData >= firstData && !structured) {
        const cached = typedValue(totals[col.key], col.format);
        sheet.set(r, c, { f: `SUBTOTAL(${fn},${colName(c)}${firstData + 1}:${colName(c)}${lastData + 1})`, v: typeof cached === "number" ? cached : undefined, s: style });
      } else {
        sheet.set(r, c, { v: typedValue(totals[col.key], rule && code[rule] ? col.format : "text"), s: style });
      }
    });
    r++;
  }

  if (opts.freeze) {
    sheet.freeze = { row: headRow + 1 };
    sheet.printTitleRows = { from: headRow, to: headRow };
    if (!structured) sheet.autoFilter = { fromRow: headRow, toRow: lastData, fromCol: 0, toCol: cols.length - 1 };
  }

  // Column widths from the header and the longest displayed value (sampled for big tables).
  const sample = section.rows.length > 2000 ? section.rows.filter((_, i) => i % Math.ceil(section.rows.length / 2000) === 0) : section.rows;
  cols.forEach((col: ReportColumn, c) => {
    const longest = Math.max(displayLen(col.header) * 1.1, ...sample.map((row) => displayLen(formatValue(row[col.key], col.format, ctx))));
    const w = col.wrap ? Math.min(60, Math.max(28, col.width ?? 40)) : Math.min(55, Math.max(9, (col.width ?? longest) + 3));
    sheet.colWidths[c] = Math.max(sheet.colWidths[c] ?? 0, w);
  });
  return r + 1;
}

function writeCharts(sheet: XSheet, charts: ChartSection[], ctx: ReportContext, startRow: number): void {
  let r = startRow;
  sheet.colWidths[0] = Math.max(sheet.colWidths[0] ?? 0, 24);
  for (const section of charts) {
    const { chart } = section;
    const isPie = chart.type === "pie" || chart.type === "donut";
    const series = isPie ? chart.series.slice(0, 1) : chart.series;
    sheet.set(r, 0, { v: section.title || "Chart", s: S.section });
    for (let c = 1; c <= series.length; c++) sheet.set(r, c, { s: S.section });
    r++;
    const headRow = r;
    sheet.set(r, 0, { v: "Category", s: S.head });
    series.forEach((s, i) => {
      sheet.set(r, i + 1, { v: s.name, s: { ...S.head, align: "right" } });
      sheet.colWidths[i + 1] = Math.max(sheet.colWidths[i + 1] ?? 0, Math.min(28, s.name.length + 6), 14);
    });
    r++;
    const fmt = numFmtFor(chart.valueFormat ?? "number", ctx);
    const from = r;
    chart.categories.forEach((cat, ci) => {
      sheet.set(r, 0, { v: cat, s: { border: "bottom", borderColor: "E5E7EB" } });
      series.forEach((s, si) => {
        const v = s.values[ci];
        sheet.set(r, si + 1, { v: typeof v === "number" ? (chart.valueFormat === "percent" ? v / 100 : v) : null, s: { numFmt: fmt, border: "bottom", borderColor: "E5E7EB" } });
      });
      r++;
    });
    const to = r - 1;
    const height = Math.max(16, chart.categories.length + 3);
    if (chart.categories.length) {
      sheet.charts.push({
        type: chart.type,
        title: section.title,
        categories: { sheet: sheet.name, col: 0, fromRow: from, toRow: to, cache: chart.categories },
        series: series.map((s, si) => ({
          name: s.name,
          nameCell: { row: headRow, col: si + 1 },
          col: si + 1,
          color: s.color,
          cache: chart.categories.map((_, ci) => { const v = s.values[ci]; return typeof v === "number" ? (chart.valueFormat === "percent" ? v / 100 : v) : NaN; }),
        })),
        pointColors: chart.colors ?? (isPie ? chart.categories.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]) : undefined),
        numFmt: fmt,
        anchor: { col: series.length + 2, row: headRow - 1, toCol: series.length + 11, toRow: headRow - 1 + height },
      });
    }
    r = Math.max(r, headRow - 1 + height) + 2;
  }
}

export async function buildReportExcel(report: ReportDocument, ctx: ReportContext): Promise<Blob> {
  const taken = new Set<string>();
  const sheets: XSheet[] = [];
  const landscape = resolveOrientation(report) === "landscape";
  const tables = report.sections.filter((s): s is TableSection => s.kind === "table");
  const charts = report.sections.filter((s): s is ChartSection => s.kind === "chart");
  const summaryParts = report.sections.filter((s) => s.kind === "kpis" || s.kind === "keyValue" || s.kind === "text");

  if (summaryParts.length || (!tables.length && !charts.length)) {
    const sheet = new XSheet(safeSheetName("Summary", taken));
    sheet.showGridLines = false;
    sheet.colWidths[0] = 34;
    sheet.colWidths[1] = 26;
    sheet.colWidths[2] = 34;
    let r = writeHeader(sheet, report, ctx, 3, true);
    for (const s of summaryParts) {
      if (s.kind === "kpis" || s.kind === "keyValue") {
        sheet.set(r, 0, { v: s.title || (s.kind === "kpis" ? "Key Metrics" : "Details"), s: S.section });
        sheet.set(r, 1, { s: S.section });
        sheet.set(r, 2, { s: S.section });
        r++;
        if (s.kind === "kpis") {
          sheet.set(r, 0, { v: "Metric", s: S.head });
          sheet.set(r, 1, { v: "Value", s: { ...S.head, align: "right" } });
          sheet.set(r, 2, { v: "Notes", s: S.head });
          r++;
        }
        const items = s.kind === "kpis" ? s.items : s.items.map((i) => ({ ...i, hint: undefined as string | undefined }));
        for (const it of items) {
          sheet.set(r, 0, { v: it.label, s: { bold: s.kind === "keyValue", color: "374151", border: "bottom", borderColor: "E5E7EB" } });
          sheet.set(r, 1, { v: typedValue(it.value, it.format), s: { bold: s.kind === "kpis", numFmt: numFmtFor(it.format, ctx), align: "right", border: "bottom", borderColor: "E5E7EB" } });
          sheet.set(r, 2, { v: it.hint ?? null, s: { size: 9, color: "6B7280", border: "bottom", borderColor: "E5E7EB" } });
          r++;
        }
        r++;
      } else if (s.kind === "text") {
        if (s.title) { sheet.set(r, 0, { v: s.title, s: S.section }); r++; }
        sheet.set(r, 0, { v: s.text, s: { wrap: true, valign: "top", color: "374151" } });
        sheet.merge(r, 0, r, 2);
        sheet.rowHeights.set(r, Math.min(400, 15 * Math.ceil(s.text.length / 90 + (s.text.match(/\n/g)?.length ?? 0))));
        r += 2;
      }
    }
    if (!summaryParts.length) {
      sheet.set(r, 0, { v: "No data available for the selected filters.", s: S.muted });
    }
    sheets.push(sheet);
  }

  for (const t of tables) {
    const sheet = new XSheet(safeSheetName(t.sheetName || t.title || report.title, taken));
    sheet.landscape = landscape || t.columns.length > 7;
    const span = Math.max(4, t.columns.length);
    let r = writeHeader(sheet, report, ctx, span, false, t.title);
    if (t.description) { sheet.set(r - 1, 0, { v: t.description, s: S.muted }); sheet.merge(r - 1, 0, r - 1, span - 1); }
    writeTable(sheet, t, ctx, r, { freeze: true, title: false });
    sheets.push(sheet);
  }

  if (charts.length) {
    const sheet = new XSheet(safeSheetName(charts.length === 1 && charts[0].title ? charts[0].title : "Charts", taken));
    sheet.showGridLines = false;
    sheet.landscape = true;
    const r = writeHeader(sheet, report, ctx, 8, false);
    writeCharts(sheet, charts, ctx, r);
    sheets.push(sheet);
  }

  return buildWorkbook(sheets, { title: report.title, company: ctx.company.name, author: ctx.generatedBy }, CHART_PALETTE);
}
