import type { jsPDF as JsPDF } from "jspdf";
import { renderChartSvg, svgToPng } from "./chart-svg";
import { columnAlign, computeTotals, formatValue, hasChartData, isEmptyReport, isNumericFormat, reportInfo, resolveOrientation } from "./format";
import { ACCENT_HEX, ACCENT_SOFT_HEX, INK_HEX, MUTED_HEX, RULE_HEX, ZEBRA_HEX } from "./theme";
import type { ChartSection, KeyValueSection, KpiSection, ReportContext, ReportDocument, TableSection, TextSection } from "./types";

type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const ACCENT = rgb(ACCENT_HEX);
const ACCENT_SOFT = rgb(ACCENT_SOFT_HEX);
const INK = rgb(INK_HEX);
const MUTED = rgb(MUTED_HEX);
const RULE = rgb(RULE_HEX);
const ZEBRA = rgb(ZEBRA_HEX);
const GOOD: RGB = [15, 123, 77];
const BAD: RGB = [180, 35, 24];

const PT = 0.3528; // mm per point
const RASTER_FONT = "Helvetica, Arial, 'Segoe UI', 'Noto Sans Arabic', 'Noto Naskh Arabic', Tahoma, 'Geeza Pro', sans-serif";
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** Typographic punctuation folded to what the standard PDF fonts (WinAnsi) can draw. */
function latin(s: string): string {
  return s
    .replace(/[–—−]/g, "-")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/…/g, "...")
    .replace(/[•●]/g, "·")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/[    ]/g, " ")
    .replace(/[​-‏⁦-⁩]/g, "");
}

/** Text the built-in Helvetica can't draw (Arabic, Devanagari, ₹, …) — rendered by the browser instead. */
const needsRaster = (s: string) => /[^\x00-\xFF]/.test(s);

const measureCanvas = document.createElement("canvas").getContext("2d");

/** Arabic script reads small next to Helvetica at the same point size — nudge it up to match. */
let scriptBoost = 1;
function canvasFont(sizePt: number, bold: boolean, k: number) {
  return `${bold ? 700 : 400} ${sizePt * scriptBoost * PT * k}px ${RASTER_FONT}`;
}

function wrapCanvas(g: CanvasRenderingContext2D, text: string, maxPx: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const next = line + w;
      if (line.trim() && g.measureText(next).width > maxPx) {
        out.push(line.trimEnd());
        line = w.trimStart();
      } else line = next;
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** Width in mm of text drawn by the browser. */
function rasterWidthMm(text: string, sizePt: number, bold: boolean): number {
  scriptBoost = RTL.test(text) ? 1.12 : 1;
  if (!measureCanvas) return text.length * sizePt * PT * 0.55;
  measureCanvas.font = canvasFont(sizePt, bold, 1);
  return measureCanvas.measureText(text).width;
}

interface Raster { dataUrl: string; w: number; h: number }

/** Renders text (any script, shaped and bidi-ordered by the browser) to a transparent PNG at ~300 dpi. */
function rasterText(text: string, sizePt: number, bold: boolean, color: RGB, maxWidthMm: number, align: "left" | "right" | "center" = "left"): Raster | null {
  const k = 12; // px per mm ≈ 305 dpi
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d");
  if (!g) return null;
  scriptBoost = RTL.test(text) ? 1.12 : 1;
  g.font = canvasFont(sizePt, bold, k);
  const lines = wrapCanvas(g, text, maxWidthMm * k);
  const lineH = sizePt * PT * k * 1.3;
  const widest = Math.max(1, ...lines.map((l) => g.measureText(l).width));
  canvas.width = Math.ceil(Math.min(widest, maxWidthMm * k)) + 2;
  canvas.height = Math.ceil(lineH * lines.length) + 2;
  g.font = canvasFont(sizePt, bold, k);
  g.fillStyle = `rgb(${color.join(",")})`;
  g.textBaseline = "middle";
  const rtl = RTL.test(text);
  g.direction = rtl ? "rtl" : "ltr";
  const effective = align === "left" && rtl ? "left" : align;
  g.textAlign = effective === "center" ? "center" : effective;
  const x = effective === "right" ? canvas.width - 1 : effective === "center" ? canvas.width / 2 : 1;
  lines.forEach((l, i) => g.fillText(l, x, lineH * i + lineH / 2 + 1));
  return { dataUrl: canvas.toDataURL("image/png"), w: canvas.width / k, h: canvas.height / k };
}

interface TextOpts {
  size: number;
  bold?: boolean;
  color?: RGB;
  maxWidth: number;
  align?: "left" | "right" | "center";
  lineHeight?: number;
}

/** Draws wrapped text with its top at `y`; returns the height used (mm). */
function drawText(doc: JsPDF, text: string, x: number, y: number, o: TextOpts): number {
  if (!text) return 0;
  const color = o.color ?? INK;
  const align = o.align ?? "left";
  const value = latin(text);
  if (needsRaster(value)) {
    const r = rasterText(value, o.size, !!o.bold, color, o.maxWidth, align);
    if (!r) return 0;
    const ix = align === "right" ? x - r.w : align === "center" ? x - r.w / 2 : x;
    doc.addImage(r.dataUrl, "PNG", ix, y, r.w, r.h, undefined, "FAST");
    return r.h;
  }
  doc.setFont("helvetica", o.bold ? "bold" : "normal");
  doc.setFontSize(o.size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(value, o.maxWidth) as string[];
  const lh = o.size * PT * (o.lineHeight ?? 1.3);
  lines.forEach((l, i) => doc.text(l, x, y + lh * i, { baseline: "top", align }));
  return lh * lines.length;
}

function textHeight(doc: JsPDF, text: string, o: TextOpts): number {
  if (!text) return 0;
  const value = latin(text);
  const lh = o.size * PT * (o.lineHeight ?? 1.3);
  if (needsRaster(value)) {
    const w = rasterWidthMm(value, o.size, !!o.bold);
    return lh * Math.max(1, Math.ceil(w / o.maxWidth)) + 0.3;
  }
  doc.setFont("helvetica", o.bold ? "bold" : "normal");
  doc.setFontSize(o.size);
  return lh * (doc.splitTextToSize(value, o.maxWidth) as string[]).length;
}

export async function buildReportPdf(report: ReportDocument, ctx: ReportContext): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const orientation = resolveOrientation(report);
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: report.title, subject: report.subtitle ?? report.title, author: ctx.company.name || "GymBios", creator: "GymBios" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = { top: 16, right: 15, bottom: 18, left: 15 };
  const CW = W - M.left - M.right;
  const bottomLimit = H - M.bottom;
  let y = M.top;

  const newPage = () => { doc.addPage(); y = M.top; };
  const ensure = (h: number) => { if (y + h > bottomLimit) newPage(); };

  // Pre-render charts (async) so the layout pass below stays synchronous.
  const chartImages = new Map<ChartSection, { url: string; ratio: number }>();
  await Promise.all(report.sections.filter((s): s is ChartSection => s.kind === "chart" && hasChartData(s.chart)).map(async (s) => {
    const isPie = s.chart.type === "pie" || s.chart.type === "donut";
    const wPx = orientation === "landscape" && !isPie ? 1040 : 760;
    const rows = s.chart.type === "hbar" ? s.chart.categories.length * Math.max(1, s.chart.series.length) : 0;
    const base = isPie ? Math.max(250, Math.min(420, s.chart.categories.length * 22 + 40)) : s.chart.type === "hbar" ? Math.max(200, Math.min(620, rows * 24 + 30)) : 300;
    const hPx = Math.round(base * (s.height ?? 1) * (orientation === "landscape" && !isPie ? 0.88 : 1));
    const svg = renderChartSvg(s.chart, ctx, wPx, hPx);
    try {
      chartImages.set(s, { url: await svgToPng(svg, wPx, hPx, 3), ratio: hPx / wPx });
    } catch {
      /* the chart's data still goes out as its table/Excel sheet */
    }
  }));

  // ── First-page header: company (left), logo (right) ──
  const c = ctx.company;
  let logoW = 0;
  let logoH = 0;
  if (c.logo) {
    const maxW = 46, maxH = 22;
    const ratio = c.logo.width / c.logo.height;
    logoW = Math.min(maxW, maxH * ratio);
    logoH = logoW / ratio;
    try {
      doc.addImage(c.logo.dataUrl, "PNG", W - M.right - logoW, M.top, logoW, logoH, undefined, "FAST");
    } catch {
      logoW = 0; logoH = 0;
    }
  }
  const leftW = CW - (logoW ? logoW + 10 : 0);
  if (c.nameLocal) y += drawText(doc, c.nameLocal, M.left, y, { size: 13, bold: true, color: ACCENT, maxWidth: leftW }) + 0.6;
  if (c.name) y += drawText(doc, c.name, M.left, y, { size: 15, bold: true, color: ACCENT, maxWidth: leftW }) + 1.2;
  const details = [
    c.address,
    [c.phone && `Phone: ${c.phone}`, c.email && `Email: ${c.email}`].filter(Boolean).join("   |   "),
  ].filter(Boolean) as string[];
  for (const d of details) y += drawText(doc, d, M.left, y, { size: 8.5, color: MUTED, maxWidth: leftW }) + 0.4;
  if (c.trn) y += drawText(doc, `TRN: ${c.trn}`, M.left, y, { size: 8.5, bold: true, color: INK, maxWidth: leftW }) + 0.4;
  y = Math.max(y, M.top + logoH) + 3.5;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(M.left, y, W - M.right, y);
  y += 6;

  // ── Report title + information panel ──
  y += drawText(doc, report.title, M.left, y, { size: 16, bold: true, color: INK, maxWidth: CW }) + 1;
  if (report.subtitle) y += drawText(doc, report.subtitle, M.left, y, { size: 9.5, color: MUTED, maxWidth: CW }) + 1;
  y += 2.5;
  y = drawInfoGrid(doc, reportInfo(report, ctx), M.left, y, CW, orientation === "landscape" ? 4 : 3, true) + 7;

  if (isEmptyReport(report)) {
    ensure(34);
    doc.setFillColor(...ZEBRA);
    doc.setDrawColor(...RULE);
    doc.roundedRect(M.left, y, CW, 30, 2, 2, "FD");
    drawText(doc, "No data available", W / 2, y + 9, { size: 12, bold: true, color: INK, maxWidth: CW, align: "center" });
    drawText(doc, "There are no records for the selected period and filters.", W / 2, y + 16.5, { size: 9, color: MUTED, maxWidth: CW, align: "center" });
    y += 36;
  } else {
    for (const s of report.sections) {
      switch (s.kind) {
        case "pageBreak":
          newPage();
          break;
        case "kpis":
          drawKpis(s);
          break;
        case "keyValue":
          drawKeyValue(s);
          break;
        case "text":
          drawTextSection(s);
          break;
        case "chart":
          drawChart(s);
          break;
        case "table":
          drawTable(s);
          break;
      }
    }
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  const footLeft = latin([report.title, c.name].filter(Boolean).join("  ·  "));
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const fy = H - M.bottom + 7;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(M.left, fy - 2.5, W - M.right, fy - 2.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    if (!needsRaster(footLeft)) doc.text(footLeft, M.left, fy, { baseline: "top", maxWidth: CW - 40 });
    else drawText(doc, footLeft, M.left, fy, { size: 7.5, color: MUTED, maxWidth: CW - 40 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${p} of ${pages}`, W - M.right, fy, { baseline: "top", align: "right" });
  }

  return doc.output("blob");

  // ── section renderers (closures over doc / y) ──

  function sectionTitle(title?: string, description?: string, keepWith = 18) {
    if (!title) return;
    const th = textHeight(doc, title, { size: 11, bold: true, maxWidth: CW - 4 });
    const dh = description ? textHeight(doc, description, { size: 8.5, maxWidth: CW }) + 1 : 0;
    ensure(th + dh + 4 + keepWith);
    doc.setFillColor(...ACCENT);
    doc.rect(M.left, y + 0.3, 1.1, Math.max(4.2, th - 0.4), "F");
    y += drawText(doc, title, M.left + 3.2, y, { size: 11, bold: true, color: INK, maxWidth: CW - 4 }) + 1.2;
    if (description) y += drawText(doc, description, M.left, y, { size: 8.5, color: MUTED, maxWidth: CW }) + 1;
    y += 1.8;
  }

  function drawKpis(s: KpiSection) {
    if (!s.items.length) return;
    const perRow = Math.min(s.items.length, orientation === "landscape" ? 5 : 4);
    const gap = 3.5;
    const cardW = (CW - gap * (perRow - 1)) / perRow;
    const hasHint = s.items.some((i) => i.hint);
    const cardH = hasHint ? 23 : 18.5;
    sectionTitle(s.title, undefined, cardH);
    for (let i = 0; i < s.items.length; i += perRow) {
      ensure(cardH + gap);
      s.items.slice(i, i + perRow).forEach((it, j) => {
        const x = M.left + j * (cardW + gap);
        doc.setFillColor(...ZEBRA);
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, "FD");
        doc.setFillColor(...ACCENT);
        doc.rect(x, y + 3, 0.9, cardH - 6, "F");
        const inner = cardW - 7;
        drawText(doc, it.label.toUpperCase(), x + 4, y + 3, { size: 6.8, bold: true, color: MUTED, maxWidth: inner, lineHeight: 1.15 });
        const value = formatValue(it.value, it.format, ctx) || "—";
        let size = 13;
        doc.setFont("helvetica", "bold");
        while (size > 8 && (needsRaster(latin(value)) ? rasterWidthMm(value, size, true) : (doc.setFontSize(size), doc.getTextWidth(latin(value)))) > inner) size -= 0.5;
        drawText(doc, value, x + 4, y + (hasHint ? 9.2 : 9.6), { size, bold: true, color: INK, maxWidth: inner });
        if (it.hint) {
          const tone = it.tone === "good" ? GOOD : it.tone === "bad" ? BAD : MUTED;
          drawText(doc, it.hint, x + 4, y + cardH - 5.6, { size: 6.8, color: tone, maxWidth: inner, lineHeight: 1.1 });
        }
      });
      y += cardH + gap;
    }
    y += 3;
  }

  function drawKeyValue(s: KeyValueSection) {
    if (!s.items.length) return;
    sectionTitle(s.title, undefined, 12);
    y = drawInfoGrid(doc, s.items.map((i) => ({ label: i.label, value: formatValue(i.value, i.format, ctx) || "—" })), M.left, y, CW, s.columns ?? (orientation === "landscape" ? 3 : 2), false) + 6;
  }

  function drawTextSection(s: TextSection) {
    if (!s.text.trim()) return;
    sectionTitle(s.title, undefined, 10);
    for (const para of s.text.split(/\n{2,}/)) {
      const lines = needsRaster(latin(para)) ? [para] : ((doc.setFont("helvetica", "normal"), doc.setFontSize(9), doc.splitTextToSize(latin(para), CW)) as string[]);
      for (const line of lines) {
        const h = textHeight(doc, line, { size: 9, maxWidth: CW });
        ensure(h);
        const rtl = /^[^A-Za-z]*[֐-ࣿ]/.test(line);
        y += drawText(doc, line, rtl ? W - M.right : M.left, y, { size: 9, color: INK, maxWidth: CW, align: rtl ? "right" : "left" });
      }
      y += 2;
    }
    y += 3;
  }

  function drawChart(s: ChartSection) {
    const img = chartImages.get(s);
    if (!img) {
      sectionTitle(s.title, s.description, 14);
      ensure(14);
      doc.setFillColor(...ZEBRA);
      doc.roundedRect(M.left, y, CW, 12, 1.5, 1.5, "F");
      drawText(doc, "No data available for this chart.", W / 2, y + 4, { size: 8.5, color: MUTED, maxWidth: CW, align: "center" });
      y += 18;
      return;
    }
    const isPie = s.chart.type === "pie" || s.chart.type === "donut";
    let w = isPie ? Math.min(CW, 182) : CW;
    let h = w * img.ratio;
    const maxH = bottomLimit - M.top - 14;
    if (h > maxH) { h = maxH; w = h / img.ratio; }
    sectionTitle(s.title, s.description, h);
    ensure(h);
    doc.addImage(img.url, "PNG", M.left + (CW - w) / 2, y, w, h, undefined, "FAST");
    y += h + 7;
  }

  function drawTable(s: TableSection) {
    const cols = s.columns;
    sectionTitle(s.title, s.description, 22);
    if (!s.rows.length) {
      ensure(16);
      doc.setFillColor(...ZEBRA);
      doc.setDrawColor(...RULE);
      doc.roundedRect(M.left, y, CW, 13, 1.5, 1.5, "FD");
      drawText(doc, s.emptyText || "No data available for the selected filters.", W / 2, y + 4.4, { size: 8.5, color: MUTED, maxWidth: CW - 10, align: "center" });
      y += 19;
      return;
    }
    const fs = cols.length <= 6 ? 8.5 : cols.length <= 9 ? 8 : cols.length <= 12 ? 7.2 : 6.5;
    const pad = cols.length > 10 ? 1.4 : 2;
    const raster = new Map<object, string>();

    const cell = (text: string, styles: Record<string, unknown> = {}) => ({ content: latin(text), styles });
    const body = s.rows.map((row) => {
      const kind = row._kind ?? "data";
      if (kind === "section") {
        const rest = cols.slice(1).some((cl) => row[cl.key] != null && row[cl.key] !== "");
        const st = { fontStyle: "bold", fillColor: [238, 242, 241], textColor: INK };
        if (!rest) return [{ ...cell(String(row[cols[0].key] ?? ""), st), colSpan: cols.length }];
        return cols.map((cl) => cell(formatValue(row[cl.key], cl.format, ctx), { ...st, halign: columnAlign(cl) }));
      }
      const st: Record<string, unknown> =
        kind === "total" ? { fontStyle: "bold", fillColor: ACCENT_SOFT, lineWidth: { top: 0.35 }, lineColor: ACCENT }
          : kind === "subtotal" ? { fontStyle: "bold", fillColor: [243, 244, 246] }
            : kind === "muted" ? { textColor: MUTED, fontStyle: "italic" } : {};
      return cols.map((cl) => cell(formatValue(row[cl.key], cl.format, ctx), { ...st, halign: columnAlign(cl) }));
    });
    let foot: ReturnType<typeof cell>[][] | undefined;
    if (s.totals) {
      const label = typeof s.totals === "object" && s.totals.label ? s.totals.label : "Total";
      const t = computeTotals(cols, s.rows, label);
      foot = [cols.map((cl) => cell(formatValue(t[cl.key], cl.total && ["sum", "avg", "min", "max"].includes(cl.total) ? cl.format : cl.total === "count" ? "integer" : "text", ctx), { halign: columnAlign(cl) }))];
    }

    const widths = columnWidths(s, fs, pad);
    const columnStyles: Record<number, Record<string, unknown>> = {};
    cols.forEach((cl, i) => { columnStyles[i] = { halign: columnAlign(cl), cellWidth: widths[i] }; });

    autoTable(doc, {
      startY: y,
      margin: { left: M.left, right: M.right, top: M.top, bottom: M.bottom },
      head: [cols.map((cl) => cell(cl.header, { halign: columnAlign(cl) }))],
      body: body as any,
      foot: foot as any,
      showHead: "everyPage",
      showFoot: "lastPage",
      rowPageBreak: "avoid",
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: fs,
        cellPadding: { top: 1.7, bottom: 1.7, left: pad, right: pad },
        textColor: INK,
        lineColor: RULE,
        lineWidth: { bottom: 0.15 },
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: "bold", lineWidth: 0, valign: "middle" },
      footStyles: { fillColor: ACCENT_SOFT, textColor: INK, fontStyle: "bold", lineWidth: { top: 0.4 }, lineColor: ACCENT },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: columnStyles as any,
      didParseCell: (data) => {
        const text = (data.cell.text || []).join(" ");
        if (!needsRaster(text)) return;
        raster.set(data.cell, text);
        // Latin stand-in of about the same width, so widths/heights are measured sensibly.
        const em = data.cell.styles.fontSize * PT * 0.556;
        data.cell.text = [text.split(/\s+/).map((w) => "n".repeat(Math.max(1, Math.round(rasterWidthMm(w, data.cell.styles.fontSize, data.cell.styles.fontStyle === "bold") / em)))).join(" ")];
      },
      willDrawCell: (data) => {
        if (raster.has(data.cell)) data.cell.text = [];
      },
      didDrawCell: (data) => {
        const text = raster.get(data.cell);
        if (!text) return;
        const padL = data.cell.padding("left");
        const padR = data.cell.padding("right");
        const maxW = data.cell.width - padL - padR;
        const color = (Array.isArray(data.cell.styles.textColor) ? data.cell.styles.textColor : INK) as RGB;
        const halign = data.cell.styles.halign === "right" ? "right" : data.cell.styles.halign === "center" ? "center" : "left";
        const r = rasterText(text, data.cell.styles.fontSize, data.cell.styles.fontStyle === "bold", color, maxW, halign);
        if (!r) return;
        const w = Math.min(r.w, maxW);
        const h = r.h * (w / r.w);
        const x = halign === "right" ? data.cell.x + data.cell.width - padR - w : halign === "center" ? data.cell.x + (data.cell.width - w) / 2 : data.cell.x + padL;
        const yy = data.cell.y + Math.max(0, (data.cell.height - h) / 2);
        doc.addImage(r.dataUrl, "PNG", x, yy, w, h, undefined, "FAST");
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 7;
  }

  /**
   * Column widths that fill the content width: no column narrower than its longest word (so words
   * never break mid-way), numbers and dates never wrap, and spare width goes to the text columns.
   */
  function columnWidths(s: TableSection, fs: number, pad: number): number[] {
    const sample = s.rows.length > 400 ? s.rows.filter((_, k) => k % Math.ceil(s.rows.length / 400) === 0) : s.rows;
    const widthOf = (t: string, bold: boolean) => {
      const v = latin(t);
      if (needsRaster(v)) return rasterWidthMm(v, fs, bold);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(fs);
      return doc.getTextWidth(v);
    };
    const extra = pad * 2 + 0.8;
    const nat: number[] = [];
    const min: number[] = [];
    const totalsRow = s.totals ? computeTotals(s.columns, s.rows, typeof s.totals === "object" && s.totals.label ? s.totals.label : "Total") : null;
    s.columns.forEach((cl) => {
      const texts = sample.map((r) => formatValue(r[cl.key], cl.format, ctx)).filter(Boolean);
      if (totalsRow) texts.push(formatValue(totalsRow[cl.key], cl.total && cl.total !== "count" && ["sum", "avg", "min", "max"].includes(cl.total) ? cl.format : "text", ctx));
      const bold = (t: string) => sample.some((r) => r._kind && r._kind !== "data" && r._kind !== "muted" && formatValue(r[cl.key], cl.format, ctx) === t);
      const headWord = Math.max(0, ...latin(cl.header).split(/\s+/).map((w) => widthOf(w, true)));
      const headFull = widthOf(cl.header, true);
      const longest = Math.max(0, ...texts.map((t, i) => widthOf(t, bold(t) || (!!totalsRow && i === texts.length - 1))));
      const word = Math.max(0, ...texts.map((t) => Math.max(...t.split(/\s+/).map((w) => widthOf(w, false)))));
      if (isNumericFormat(cl.format) || cl.format === "date" || cl.format === "time" || cl.format === "datetime") {
        const w = Math.max(longest, headWord) + extra;
        nat.push(Math.max(w, Math.min(headFull + extra, w * 1.6)));
        min.push(w);
      } else if (cl.wrap) {
        nat.push(Math.min(Math.max(longest, headFull) + extra, 78));
        min.push(Math.min(Math.max(word, headWord, 26) + extra, 42));
      } else {
        nat.push(Math.min(Math.max(longest, headFull) + extra, 72));
        min.push(Math.min(Math.max(word, headWord) + extra, 40));
      }
    });
    const sumNat = nat.reduce((a, b) => a + b, 0);
    const sumMin = min.reduce((a, b) => a + b, 0);
    if (sumNat <= CW) {
      // Room to spare: widen text columns (or all, when every column is numeric).
      const textIdx = s.columns.map((cl, i) => (!isNumericFormat(cl.format) && cl.format !== "date" ? i : -1)).filter((i) => i >= 0);
      const grow = textIdx.length ? textIdx : s.columns.map((_, i) => i);
      const base = grow.reduce((a, i) => a + nat[i], 0) || 1;
      return nat.map((w, i) => (grow.includes(i) ? w + ((CW - sumNat) * nat[i]) / base : w));
    }
    if (sumMin <= CW) {
      const slack = nat.map((w, i) => w - min[i]);
      const sumSlack = slack.reduce((a, b) => a + b, 0) || 1;
      return min.map((w, i) => w + ((CW - sumMin) * slack[i]) / sumSlack);
    }
    return min.map((w) => (w * CW) / sumMin);
  }

  /** Label-over-value grid (report info panel / key-value sections). Returns the bottom y. */
  function drawInfoGrid(d: JsPDF, items: { label: string; value: string }[], x0: number, y0: number, width: number, perRow: number, panel: boolean): number {
    if (!items.length) return y0;
    const padX = panel ? 4 : 0;
    const padY = panel ? 3.2 : 0;
    const colW = (width - padX * 2) / perRow;
    const rowsOf: { label: string; value: string }[][] = [];
    for (let i = 0; i < items.length; i += perRow) rowsOf.push(items.slice(i, i + perRow));
    const heights = rowsOf.map((r) => Math.max(...r.map((it) => textHeight(d, it.value, { size: 8.8, maxWidth: colW - 4 }))) + 4.4);
    const total = heights.reduce((s, h) => s + h, 0) + (rowsOf.length - 1) * 1.6 + padY * 2;
    if (y0 + Math.min(total, 40) > bottomLimit) { newPage(); y0 = y; }
    if (panel) {
      d.setFillColor(...ZEBRA);
      d.setDrawColor(...RULE);
      d.setLineWidth(0.25);
      d.roundedRect(x0, y0, width, total, 1.8, 1.8, "FD");
    }
    let yy = y0 + padY;
    rowsOf.forEach((r, ri) => {
      if (yy + heights[ri] > bottomLimit) { newPage(); yy = y; }
      r.forEach((it, ci) => {
        const x = x0 + padX + ci * colW;
        drawText(d, it.label.toUpperCase(), x, yy, { size: 6.6, bold: true, color: MUTED, maxWidth: colW - 4 });
        drawText(d, it.value, x, yy + 3.4, { size: 8.8, color: INK, maxWidth: colW - 4, bold: !panel });
      });
      yy += heights[ri] + 1.6;
    });
    return yy - 1.6 + padY;
  }
}
