import { LOCAL_NAME_FONT_STACK } from "../../utils/company-details";
import { PRINT_FONT } from "../../utils/print-font";
import { printHtml } from "../../utils/print-html";
import { renderChartSvg } from "./chart-svg";
import { columnAlign, computeTotals, escapeHtml as e, formatValue, hasChartData, isEmptyReport, reportInfo, resolveOrientation } from "./format";
import { ACCENT_HEX, ACCENT_SOFT_HEX, INK_HEX, MUTED_HEX, RULE_HEX, ZEBRA_HEX } from "./theme";
import type { ReportContext, ReportDocument, ReportSection, TableSection } from "./types";

const css = (landscape: boolean, footer: string) => `
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 15mm 14mm 17mm 14mm;
    @bottom-left { content: "${footer.replace(/["\\]/g, "")}"; font: 7.5pt ${PRINT_FONT}; color: ${MUTED_HEX}; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt ${PRINT_FONT}; color: ${MUTED_HEX}; }
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${PRINT_FONT}; color: ${INK_HEX}; font-size: 9pt; line-height: 1.4; }
  .doc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; padding-bottom: 3.5mm; border-bottom: 0.6mm solid ${ACCENT_HEX}; margin-bottom: 6mm; }
  .co-local { text-align: left; font-family: ${LOCAL_NAME_FONT_STACK}; font-size: 13pt; font-weight: 700; color: ${ACCENT_HEX}; unicode-bidi: isolate; line-height: 1.35; }
  .co-name { font-size: 15pt; font-weight: 700; color: ${ACCENT_HEX}; line-height: 1.25; margin-bottom: 1mm; }
  .co-line { font-size: 8.5pt; color: ${MUTED_HEX}; }
  .co-trn { font-size: 8.5pt; font-weight: 700; color: ${INK_HEX}; }
  .logo { max-width: 46mm; max-height: 22mm; object-fit: contain; display: block; }
  h1 { font-size: 16pt; margin: 0 0 1mm; line-height: 1.25; }
  .subtitle { color: ${MUTED_HEX}; font-size: 9.5pt; margin-bottom: 1mm; }
  .info { display: grid; grid-template-columns: repeat(${landscape ? 4 : 3}, 1fr); gap: 2.4mm 4mm; background: ${ZEBRA_HEX}; border: 0.25mm solid ${RULE_HEX}; border-radius: 1.8mm; padding: 3.2mm 4mm; margin: 2.5mm 0 7mm; break-inside: avoid; }
  .k { font-size: 6.6pt; font-weight: 700; color: ${MUTED_HEX}; text-transform: uppercase; letter-spacing: .02em; }
  .v { font-size: 8.8pt; }
  .kv { display: grid; gap: 2.4mm 4mm; margin-bottom: 6mm; break-inside: avoid; }
  .kv .v { font-weight: 600; }
  .sec-title { font-size: 11pt; font-weight: 700; border-left: 1.1mm solid ${ACCENT_HEX}; padding-left: 2.2mm; margin: 0 0 2.6mm; break-after: avoid; page-break-after: avoid; }
  .sec-desc { color: ${MUTED_HEX}; font-size: 8.5pt; margin: -1.4mm 0 2.4mm; break-after: avoid; }
  section { margin-bottom: 7mm; }
  .kpis { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3.5mm; }
  .kpi { background: ${ZEBRA_HEX}; border: 0.25mm solid ${RULE_HEX}; border-left: 0.9mm solid ${ACCENT_HEX}; border-radius: 1.8mm; padding: 2.6mm 3.2mm; break-inside: avoid; }
  .kpi .val { font-size: 13pt; font-weight: 700; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kpi .hint { font-size: 6.8pt; color: ${MUTED_HEX}; margin-top: .6mm; }
  .kpi .hint.good { color: #0f7b4d; } .kpi .hint.bad { color: #b42318; }
  .chart { break-inside: avoid; page-break-inside: avoid; }
  .chart svg { width: 100%; height: auto; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: var(--fs); }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th { background: ${ACCENT_HEX}; color: #fff; font-weight: 700; text-align: left; padding: 1.7mm 2mm; vertical-align: middle; }
  td { padding: 1.6mm 2mm; border-bottom: 0.15mm solid ${RULE_HEX}; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: ${ZEBRA_HEX}; }
  .r { text-align: right; white-space: nowrap; } .c { text-align: center; } .nw { white-space: nowrap; }
  tr.section td { background: #eef2f1 !important; font-weight: 700; }
  tr.subtotal td { background: #f3f4f6 !important; font-weight: 700; }
  tr.total td, tfoot td { background: ${ACCENT_SOFT_HEX} !important; font-weight: 700; border-top: 0.4mm solid ${ACCENT_HEX}; }
  tr.muted td { color: ${MUTED_HEX}; font-style: italic; }
  .empty { background: ${ZEBRA_HEX}; border: 0.25mm solid ${RULE_HEX}; border-radius: 1.8mm; padding: 4mm; text-align: center; color: ${MUTED_HEX}; }
  .empty.big { padding: 9mm; } .empty.big b { display: block; color: ${INK_HEX}; font-size: 12pt; margin-bottom: 1.5mm; }
  .text p { margin: 0 0 2mm; white-space: pre-wrap; text-align: start; }
  [dir="auto"] { unicode-bidi: isolate; }
`;

const auto = (s: string) => (/[^\x00-\u024F\u2000-\u20CF]/.test(s) ? ` dir="auto"` : "");

function tableHtml(s: TableSection, ctx: ReportContext): string {
  if (!s.rows.length) return `<div class="empty">${e(s.emptyText || "No data available for the selected filters.")}</div>`;
  const cols = s.columns;
  // Short values (codes, dates, statuses) never wrap; free text does.
  const sample = s.rows.length > 300 ? s.rows.filter((_, i) => i % Math.ceil(s.rows.length / 300) === 0) : s.rows;
  const nowrap = cols.map((c) => !c.wrap && (c.format === "date" || c.format === "time" || Math.max(0, ...sample.map((r) => formatValue(r[c.key], c.format, ctx).length)) <= 18));
  const cellCls = (c: (typeof cols)[number], i: number) => {
    const a = columnAlign(c);
    const list = [a === "right" ? "r" : a === "center" ? "c" : "", nowrap[i] ? "nw" : ""].filter(Boolean);
    return list.length ? ` class="${list.join(" ")}"` : "";
  };
  const cls = (a: string) => (a === "right" ? ` class="r"` : a === "center" ? ` class="c"` : "");
  const fs = cols.length <= 6 ? 8.5 : cols.length <= 9 ? 8 : cols.length <= 12 ? 7.2 : 6.5;
  const head = `<thead><tr>${cols.map((c) => `<th${cls(columnAlign(c))}>${e(c.header)}</th>`).join("")}</tr></thead>`;
  const body = s.rows.map((row) => {
    const kind = row._kind ?? "data";
    if (kind === "section" && !cols.slice(1).some((c) => row[c.key] != null && row[c.key] !== "")) {
      const t = String(row[cols[0].key] ?? "");
      return `<tr class="section"><td colspan="${cols.length}"${auto(t)}>${e(t)}</td></tr>`;
    }
    return `<tr${kind !== "data" ? ` class="${kind}"` : ""}>${cols.map((c, i) => {
      const t = formatValue(row[c.key], c.format, ctx);
      return `<td${cellCls(c, i)}${auto(t)}>${e(t)}</td>`;
    }).join("")}</tr>`;
  }).join("");
  let foot = "";
  if (s.totals) {
    const label = typeof s.totals === "object" && s.totals.label ? s.totals.label : "Total";
    const t = computeTotals(cols, s.rows, label);
    foot = `<tfoot><tr>${cols.map((c) => `<td${cls(columnAlign(c))}>${e(formatValue(t[c.key], c.total && ["sum", "avg", "min", "max"].includes(c.total) ? c.format : c.total === "count" ? "integer" : "text", ctx))}</td>`).join("")}</tr></tfoot>`;
  }
  return `<table style="--fs:${fs}pt">${head}<tbody>${body}</tbody>${foot}</table>`;
}

function sectionHtml(s: ReportSection, ctx: ReportContext, landscape: boolean): string {
  const title = "title" in s && s.title ? `<div class="sec-title"${auto(s.title)}>${e(s.title)}</div>` : "";
  const desc = "description" in s && s.description ? `<div class="sec-desc">${e(s.description)}</div>` : "";
  switch (s.kind) {
    case "pageBreak":
      return `<div style="break-after:page;page-break-after:always"></div>`;
    case "kpis": {
      if (!s.items.length) return "";
      const n = Math.min(s.items.length, landscape ? 5 : 4);
      return `<section>${title}<div class="kpis" style="--n:${n}">${s.items.map((k) => `<div class="kpi"><div class="k">${e(k.label)}</div><div class="val"${auto(String(k.value ?? ""))}>${e(formatValue(k.value, k.format, ctx) || "—")}</div>${k.hint ? `<div class="hint ${k.tone ?? ""}">${e(k.hint)}</div>` : ""}</div>`).join("")}</div></section>`;
    }
    case "keyValue": {
      if (!s.items.length) return "";
      const n = s.columns ?? (landscape ? 3 : 2);
      return `<section>${title}<div class="kv" style="grid-template-columns:repeat(${n},1fr)">${s.items.map((i) => {
        const v = formatValue(i.value, i.format, ctx) || "—";
        return `<div><div class="k">${e(i.label)}</div><div class="v"${auto(v)}>${e(v)}</div></div>`;
      }).join("")}</div></section>`;
    }
    case "text":
      return s.text.trim() ? `<section class="text">${title}${s.text.split(/\n{2,}/).map((p) => `<p${auto(p)}>${e(p)}</p>`).join("")}</section>` : "";
    case "chart": {
      if (!hasChartData(s.chart)) return `<section class="chart">${title}${desc}<div class="empty">No data available for this chart.</div></section>`;
      const isPie = s.chart.type === "pie" || s.chart.type === "donut";
      const rows = s.chart.type === "hbar" ? s.chart.categories.length * Math.max(1, s.chart.series.length) : 0;
      const base = isPie ? Math.max(250, Math.min(420, s.chart.categories.length * 22 + 40)) : s.chart.type === "hbar" ? Math.max(200, Math.min(620, rows * 24 + 30)) : 300;
      const h = Math.round(base * (s.height ?? 1) * (landscape && !isPie ? 0.88 : 1));
      const w = landscape && !isPie ? 1040 : 760;
      return `<section class="chart">${title}${desc}<div style="${isPie ? "max-width:182mm" : ""}">${renderChartSvg(s.chart, ctx, w, h)}</div></section>`;
    }
    case "table":
      return `<section>${title}${desc}${tableHtml(s, ctx)}</section>`;
  }
}

export function buildReportPrintHtml(report: ReportDocument, ctx: ReportContext): string {
  const landscape = resolveOrientation(report) === "landscape";
  const c = ctx.company;
  const contact = ([c.phone && `Phone: ${c.phone}`, c.email && `Email: ${c.email}`].filter(Boolean) as string[]).map(e).join("&nbsp;&nbsp;|&nbsp;&nbsp;");
  const head = `<header class="doc-head">
    <div>
      ${c.nameLocal ? `<div class="co-local" dir="auto"${/[\u0600-\u06FF]/.test(c.nameLocal) ? ' lang="ar"' : ""}>${e(c.nameLocal)}</div>` : ""}
      ${c.name ? `<div class="co-name">${e(c.name)}</div>` : ""}
      ${c.address ? `<div class="co-line"${auto(c.address)}>${e(c.address)}</div>` : ""}
      ${contact ? `<div class="co-line">${contact}</div>` : ""}
      ${c.trn ? `<div class="co-trn">TRN: ${e(c.trn)}</div>` : ""}
    </div>
    ${c.logo ? `<img class="logo" src="${c.logo.dataUrl}" alt=""/>` : ""}
  </header>`;
  const info = reportInfo(report, ctx).map((i) => `<div><div class="k">${e(i.label)}</div><div class="v"${auto(i.value)}>${e(i.value)}</div></div>`).join("");
  const body = isEmptyReport(report)
    ? `<div class="empty big"><b>No data available</b>There are no records for the selected period and filters.</div>`
    : report.sections.map((s) => sectionHtml(s, ctx, landscape)).join("");
  const footer = [report.title, c.name].filter(Boolean).join("  ·  ");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${e(report.title)}</title><style>${css(landscape, footer)}</style></head><body>
    ${head}
    <h1${auto(report.title)}>${e(report.title)}</h1>
    ${report.subtitle ? `<div class="subtitle">${e(report.subtitle)}</div>` : ""}
    <div class="info">${info}</div>
    ${body}
  </body></html>`;
}

export function printReport(report: ReportDocument, ctx: ReportContext): void {
  printHtml(buildReportPrintHtml(report, ctx));
}
