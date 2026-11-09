import { escapeHtml, formatCompact, formatValue } from "./format";
import type { ChartSpec, ReportContext } from "./types";

/**
 * Renders a report chart from its data as a self-contained SVG string (no app CSS, no CSS
 * variables), so the same chart prints inline and rasterises cleanly into the PDF. Colours are the
 * fixed, validated dataviz slots the analytics pages use, so categories stay distinct in any theme.
 */
export const CHART_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#d9a21b", "#d14d8a", "#2a9fb8", "#8a8780", "#184f95", "#9c5a2e"];

const FONT = "Helvetica, Arial, 'Segoe UI', 'Noto Sans Arabic', Tahoma, sans-serif";
const INK = "#2c2c2a";
const MUTED = "#6f6d67";
const GRID = "#e6e5e0";

type Ctx = Pick<ReportContext, "currencyPrefix">;

const textWidth = (s: string, size: number) => s.length * size * 0.56;
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const f1 = (n: number) => Math.round(n * 10) / 10;

function niceStep(range: number, ticks: number): number {
  const raw = range / Math.max(1, ticks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function niceScale(min: number, max: number, ticks = 5) {
  if (min === max) { max = min === 0 ? 1 : min > 0 ? min * 1.2 : 0; min = Math.min(0, min); }
  const step = niceStep(max - min, ticks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) values.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, values };
}

function colorFor(spec: ChartSpec, i: number): string {
  return spec.series[i]?.color || CHART_PALETTE[i % CHART_PALETTE.length];
}

function legendSvg(items: { label: string; color: string }[], x: number, y: number, maxWidth: number): { svg: string; height: number } {
  let cx = x;
  let cy = y;
  const parts: string[] = [];
  for (const it of items) {
    const label = trunc(it.label, 32);
    const w = 14 + textWidth(label, 10.5) + 16;
    if (cx + w > x + maxWidth && cx > x) { cx = x; cy += 17; }
    parts.push(`<rect x="${f1(cx)}" y="${f1(cy - 8)}" width="10" height="10" rx="2" fill="${it.color}"/>`);
    parts.push(`<text x="${f1(cx + 14)}" y="${f1(cy + 1)}" font-size="10.5" fill="${INK}">${escapeHtml(label)}</text>`);
    cx += w;
  }
  return { svg: parts.join(""), height: cy - y + 16 };
}

export function renderChartSvg(spec: ChartSpec, ctx: Ctx, width = 720, height = 300): string {
  const body = spec.type === "pie" || spec.type === "donut"
    ? pieSvg(spec, ctx, width, height)
    : spec.type === "hbar"
      ? hbarSvg(spec, ctx, width, height)
      : cartesianSvg(spec, ctx, width, height);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${FONT}"><rect width="${width}" height="${height}" fill="#ffffff"/>${body}</svg>`;
}

function cartesianSvg(spec: ChartSpec, ctx: Ctx, W: number, H: number): string {
  const n = spec.categories.length;
  const stacked = spec.type === "stacked-bar";
  const isBar = spec.type === "bar" || stacked;
  const parts: string[] = [];

  let top = 8;
  if (spec.series.length > 1) {
    const lg = legendSvg(spec.series.map((s, i) => ({ label: s.name, color: colorFor(spec, i) })), 8, top + 10, W - 16);
    parts.push(lg.svg);
    top += lg.height + 6;
  }

  // Value range
  let min = 0;
  let max = 0;
  for (let c = 0; c < n; c++) {
    if (stacked) {
      let pos = 0, neg = 0;
      spec.series.forEach((s) => { const v = num(s.values[c]); if (v >= 0) pos += v; else neg += v; });
      max = Math.max(max, pos); min = Math.min(min, neg);
    } else {
      spec.series.forEach((s) => { const v = num(s.values[c]); max = Math.max(max, v); min = Math.min(min, v); });
    }
  }
  const scale = niceScale(min, max, 5);
  const yLabels = scale.values.map((v) => formatCompact(v, spec.valueFormat, ctx));
  const left = Math.max(...yLabels.map((l) => textWidth(l, 10))) + 14;

  // X labels: rotate when crowded, thin out when very crowded
  const right = 12;
  const plotW = W - left - right;
  const band = plotW / Math.max(1, n);
  const longest = Math.max(0, ...spec.categories.map((c) => textWidth(trunc(c, 18), 10)));
  const rotate = longest > band - 4;
  const every = rotate ? Math.max(1, Math.ceil((14 * n) / plotW)) : 1;
  const bottom = rotate ? Math.min(78, Math.sin(Math.PI / 5) * longest + 22) : 26;
  const plotH = H - top - bottom;
  const y = (v: number) => top + plotH - ((v - scale.lo) / (scale.hi - scale.lo || 1)) * plotH;

  scale.values.forEach((v, i) => {
    const yy = f1(y(v));
    parts.push(`<line x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}" stroke="${v === 0 ? "#bdbbb4" : GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${left - 7}" y="${yy + 3.5}" font-size="10" fill="${MUTED}" text-anchor="end">${escapeHtml(yLabels[i])}</text>`);
  });

  spec.categories.forEach((c, i) => {
    if (i % every !== 0) return;
    const cx = f1(left + band * i + band / 2);
    const label = escapeHtml(trunc(c, rotate ? 18 : Math.max(4, Math.floor(band / 6))));
    parts.push(rotate
      ? `<text transform="translate(${cx},${f1(top + plotH + 12)}) rotate(-36)" font-size="10" fill="${MUTED}" text-anchor="end">${label}</text>`
      : `<text x="${cx}" y="${f1(top + plotH + 16)}" font-size="10" fill="${MUTED}" text-anchor="middle">${label}</text>`);
  });

  const zero = y(Math.max(scale.lo, 0));
  if (isBar) {
    const groupW = band * 0.72;
    const barW = stacked ? groupW : groupW / Math.max(1, spec.series.length);
    const showLabels = spec.series.length === 1 && n <= 14;
    for (let c = 0; c < n; c++) {
      let posBase = 0, negBase = 0;
      spec.series.forEach((s, si) => {
        const v = num(s.values[c]);
        if (v === 0 && !stacked) return;
        let y0: number, y1: number;
        if (stacked) {
          if (v >= 0) { y0 = y(posBase); y1 = y(posBase + v); posBase += v; } else { y0 = y(negBase); y1 = y(negBase + v); negBase += v; }
        } else { y0 = zero; y1 = y(v); }
        const x = left + band * c + (band - groupW) / 2 + (stacked ? 0 : barW * si);
        const h = Math.abs(y0 - y1);
        if (h < 0.01) return;
        const color = spec.series.length === 1 && spec.colors?.[c] ? spec.colors[c] : colorFor(spec, si);
        parts.push(`<rect x="${f1(x + 0.5)}" y="${f1(Math.min(y0, y1))}" width="${f1(Math.max(1, barW - 1))}" height="${f1(h)}" rx="${Math.min(2.5, barW / 4)}" fill="${color}"/>`);
        if (showLabels) {
          parts.push(`<text x="${f1(x + barW / 2)}" y="${f1(v >= 0 ? y1 - 4 : y1 + 11)}" font-size="9.5" fill="${INK}" text-anchor="middle">${escapeHtml(formatCompact(v, spec.valueFormat, ctx))}</text>`);
        }
      });
    }
  } else {
    spec.series.forEach((s, si) => {
      const color = colorFor(spec, si);
      const pts = spec.categories.map((_, c) => [left + band * c + band / 2, y(num(s.values[c]))] as const);
      if (!pts.length) return;
      const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${f1(px)} ${f1(py)}`).join(" ");
      if (spec.type === "area") {
        parts.push(`<path d="${line} L${f1(pts[pts.length - 1][0])} ${f1(zero)} L${f1(pts[0][0])} ${f1(zero)} Z" fill="${color}" fill-opacity="0.14"/>`);
      }
      parts.push(`<path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);
      if (n <= 31) pts.forEach(([px, py]) => parts.push(`<circle cx="${f1(px)}" cy="${f1(py)}" r="2.6" fill="#ffffff" stroke="${color}" stroke-width="1.6"/>`));
    });
  }
  return parts.join("");
}

function hbarSvg(spec: ChartSpec, ctx: Ctx, W: number, H: number): string {
  const n = spec.categories.length;
  const parts: string[] = [];
  let top = 6;
  if (spec.series.length > 1) {
    const lg = legendSvg(spec.series.map((s, i) => ({ label: s.name, color: colorFor(spec, i) })), 8, top + 10, W - 16);
    parts.push(lg.svg);
    top += lg.height + 4;
  }
  const labels = spec.categories.map((c) => trunc(c, 26));
  const left = Math.min(W * 0.34, Math.max(...labels.map((l) => textWidth(l, 10.5))) + 14);
  let max = 0;
  spec.series.forEach((s) => s.values.forEach((v) => { max = Math.max(max, num(v)); }));
  const valueLabels = spec.series.map((s) => s.values.map((v) => formatCompact(num(v), spec.valueFormat, ctx)));
  const right = Math.max(...valueLabels.flat().map((l) => textWidth(l, 9.5)), 20) + 12;
  const plotW = W - left - right;
  const band = (H - top - 6) / Math.max(1, n);
  const groupH = Math.min(band * 0.7, 26 * spec.series.length);
  const barH = groupH / Math.max(1, spec.series.length);
  labels.forEach((l, c) => {
    const cy = top + band * c + band / 2;
    parts.push(`<text x="${left - 8}" y="${f1(cy + 3.5)}" font-size="10.5" fill="${INK}" text-anchor="end">${escapeHtml(l)}</text>`);
    spec.series.forEach((s, si) => {
      const v = Math.max(0, num(s.values[c]));
      const w = max ? (v / max) * plotW : 0;
      const by = cy - groupH / 2 + barH * si;
      const color = spec.series.length === 1 && spec.colors?.[c] ? spec.colors[c] : colorFor(spec, si);
      parts.push(`<rect x="${left}" y="${f1(by + 0.5)}" width="${f1(Math.max(w, 0.8))}" height="${f1(Math.max(1, barH - 1))}" rx="2" fill="${color}"/>`);
      parts.push(`<text x="${f1(left + w + 5)}" y="${f1(by + barH / 2 + 3.3)}" font-size="9.5" fill="${MUTED}">${escapeHtml(valueLabels[si][c])}</text>`);
    });
  });
  parts.push(`<line x1="${left}" x2="${left}" y1="${top}" y2="${H - 6}" stroke="#bdbbb4"/>`);
  return parts.join("");
}

function pieSvg(spec: ChartSpec, ctx: Ctx, W: number, H: number): string {
  const values = (spec.series[0]?.values ?? []).map((v) => Math.max(0, num(v)));
  const total = values.reduce((s, v) => s + v, 0);
  const parts: string[] = [];
  const r = Math.min(H / 2 - 12, W * 0.2);
  const cx = r + 24;
  const cy = H / 2;
  const inner = spec.type === "donut" ? r * 0.58 : 0;
  const colors = spec.categories.map((_, i) => spec.colors?.[i] || CHART_PALETTE[i % CHART_PALETTE.length]);
  let a = -Math.PI / 2;
  values.forEach((v, i) => {
    if (!v || !total) return;
    const sweep = (v / total) * Math.PI * 2;
    if (sweep >= Math.PI * 2 - 1e-6) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[i]}"/>`);
    } else {
      const a2 = a + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const p = (ang: number, rad: number) => `${f1(cx + rad * Math.cos(ang))} ${f1(cy + rad * Math.sin(ang))}`;
      parts.push(`<path d="M${cx} ${cy} L${p(a, r)} A${r} ${r} 0 ${large} 1 ${p(a2, r)} Z" fill="${colors[i]}" stroke="#ffffff" stroke-width="1.5"/>`);
    }
    a += sweep;
  });
  if (inner) {
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${f1(inner)}" fill="#ffffff"/>`);
    parts.push(`<text x="${cx}" y="${f1(cy - 2)}" font-size="13" font-weight="700" fill="${INK}" text-anchor="middle">${escapeHtml(formatCompact(total, spec.valueFormat, ctx))}</text>`);
    parts.push(`<text x="${cx}" y="${f1(cy + 13)}" font-size="9.5" fill="${MUTED}" text-anchor="middle">Total</text>`);
  }
  if (!total) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GRID}" stroke-width="10"/>`);

  // Legend table: label · value · share
  const lx = cx + r + 34;
  const rows = spec.categories.length;
  const rowH = Math.min(22, (H - 16) / Math.max(1, rows));
  const fs = rowH < 15 ? 9 : 10.5;
  const startY = cy - (rowH * rows) / 2 + rowH / 2;
  const valueX = W - 70;
  spec.categories.forEach((c, i) => {
    const yy = startY + rowH * i;
    const v = values[i] ?? 0;
    const share = total ? (v / total) * 100 : 0;
    parts.push(`<rect x="${f1(lx)}" y="${f1(yy - 6)}" width="10" height="10" rx="2" fill="${colors[i]}"/>`);
    parts.push(`<text x="${f1(lx + 16)}" y="${f1(yy + 3)}" font-size="${fs}" fill="${INK}">${escapeHtml(trunc(c, Math.max(10, Math.floor((valueX - lx - 110) / (fs * 0.56)))))}</text>`);
    parts.push(`<text x="${valueX - 10}" y="${f1(yy + 3)}" font-size="${fs}" fill="${INK}" text-anchor="end">${escapeHtml(formatValue(v, spec.valueFormat ?? "number", ctx))}</text>`);
    parts.push(`<text x="${W - 8}" y="${f1(yy + 3)}" font-size="${fs}" fill="${MUTED}" text-anchor="end">${share.toFixed(1)}%</text>`);
  });
  return parts.join("");
}

/** Rasterises an SVG string to a PNG data URL at `scale`× (≈300 dpi for a full-width A4 chart). */
export function svgToPng(svg: string, width: number, height: number, scale = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const g = canvas.getContext("2d");
        if (!g) throw new Error("Canvas is not available");
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Chart could not be rendered"));
    };
    img.src = url;
  });
}
