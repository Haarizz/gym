import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JsBarcode from 'jsbarcode';
import aedSymbolUrl from '../../assets/currency/aed-symbol.webp';
import { buildQrCodeSvg } from '../../utils/company-details';
import { CURRENCIES, type CurrencyCode } from '../../utils/currency';
import type { Product } from '../../utils/supabase/products-service';
import type { PrintTemplate } from '../../utils/supabase/print-template-service';

// Barcode label model, renderer and printer — BillBull's Barcode Print & Design
// ported to GymBios. The same <LabelView> markup drives the on-screen preview,
// the template designer and the printed labels, so what you see is what prints.

// ── Template model ───────────────────────────────────────────────────────────

export type LabelFieldKey = 'company' | 'name' | 'brand' | 'barcode' | 'barcodeText' | 'qr' | 'sku' | 'unit' | 'price';
export type LabelFields = Record<LabelFieldKey, boolean>;
export type LabelLayout = 'ROLL' | 'SHEET';
export type BarcodeFormat = 'AUTO' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14';

export interface LabelSettings {
  description: string;
  width: number;       // mm, one label
  height: number;      // mm, one label
  layout: LabelLayout; // ROLL: thermal roll, one row per page · SHEET: A4 sticker sheet
  columns: number;     // ROLL only: labels across the roll (1–3)
  gapX: number;        // mm between columns
  gapY: number;        // mm between rows (SHEET)
  marginTop: number;   // mm, SHEET page margin
  marginLeft: number;  // mm, SHEET page margin
  format: BarcodeFormat;
  contentScale: number;
  outline: boolean;    // print a thin cut guide around each label
  fields: LabelFields;
}

export interface LabelTemplate extends LabelSettings {
  /** 'builtin:<id>' or 'saved:<db id>' — stable across reloads. */
  key: string;
  id?: number;
  name: string;
  builtIn: boolean;
  isDefault: boolean;
  updatedAt?: string;
}

export const MIN_SCALE = 0.75;
export const MAX_SCALE = 1.35;

export const FIELD_META: { key: LabelFieldKey; label: string; hint?: string }[] = [
  { key: 'company', label: 'Company name', hint: 'From Settings › Company Details' },
  { key: 'name', label: 'Product name' },
  { key: 'brand', label: 'Brand' },
  { key: 'barcode', label: 'Barcode', hint: 'Turns off the QR code' },
  { key: 'barcodeText', label: 'Barcode number', hint: 'Human-readable digits under the bars' },
  { key: 'qr', label: 'QR code', hint: 'Turns off the barcode' },
  { key: 'sku', label: 'SKU' },
  { key: 'unit', label: 'Unit', hint: 'e.g. Piece, Box, Bottle' },
  { key: 'price', label: 'Selling price' },
];

export const FORMAT_OPTIONS: { value: BarcodeFormat; label: string; hint: string }[] = [
  { value: 'AUTO', label: 'Auto (from product)', hint: 'Uses the type chosen on each product, otherwise Code 128' },
  { value: 'CODE128', label: 'Code 128', hint: 'Letters and numbers — works for every product' },
  { value: 'EAN13', label: 'EAN-13', hint: 'Retail, exactly 13 digits' },
  { value: 'EAN8', label: 'EAN-8', hint: 'Retail, exactly 8 digits' },
  { value: 'UPC', label: 'UPC-A', hint: 'US retail, exactly 12 digits' },
  { value: 'CODE39', label: 'Code 39', hint: 'Industrial, capitals and numbers' },
  { value: 'ITF14', label: 'ITF-14', hint: 'Outer cartons, exactly 14 digits' },
];

const ALL_OFF: LabelFields = { company: false, name: false, brand: false, barcode: false, barcodeText: false, qr: false, sku: false, unit: false, price: false };
const on = (...keys: LabelFieldKey[]): LabelFields => keys.reduce((f, k) => ({ ...f, [k]: true }), { ...ALL_OFF });

const BASE: Omit<LabelSettings, 'description' | 'width' | 'height' | 'fields'> = {
  layout: 'ROLL', columns: 1, gapX: 2, gapY: 2, marginTop: 6, marginLeft: 6, format: 'AUTO', contentScale: 1, outline: false,
};

export function defaultLabelSettings(): LabelSettings {
  return { ...BASE, description: '', width: 50, height: 25, fields: on('name', 'barcode', 'barcodeText', 'price') };
}

const builtIn = (id: string, name: string, s: Partial<LabelSettings> & Pick<LabelSettings, 'description' | 'width' | 'height' | 'fields'>): LabelTemplate => ({
  ...BASE, ...s, key: `builtin:${id}`, name, builtIn: true, isDefault: false,
});

/** Ready-made layouts, always available even before anything is saved. */
export const BUILT_IN_TEMPLATES: LabelTemplate[] = [
  builtIn('shelf-50x25', 'Shelf Label 50×25mm', {
    description: 'Everyday price sticker for supplements and drinks', width: 50, height: 25,
    fields: on('name', 'barcode', 'barcodeText', 'price'),
  }),
  builtIn('mini-38x25', 'Mini Label 38×25mm', {
    description: 'Small sticker for bottles, bars and sachets', width: 38, height: 25, contentScale: 0.9,
    fields: on('name', 'barcode', 'barcodeText', 'price'),
  }),
  builtIn('twin-roll-38x25', '2-Up Roll 38×25mm', {
    description: 'Two labels across an 80mm thermal roll', width: 38, height: 25, columns: 2, gapX: 3, contentScale: 0.9,
    fields: on('name', 'barcode', 'barcodeText', 'price'),
  }),
  builtIn('retail-70x40', 'Retail Tag 70×40mm', {
    description: 'Brand, SKU and price for apparel and gear', width: 70, height: 40,
    fields: on('name', 'brand', 'barcode', 'barcodeText', 'sku', 'unit', 'price'),
  }),
  builtIn('detailed-100x50', 'Detailed Label 100×50mm', {
    description: 'Company, brand, SKU and price for stock rooms', width: 100, height: 50, contentScale: 1.1,
    fields: on('company', 'name', 'brand', 'barcode', 'barcodeText', 'sku', 'unit', 'price'),
  }),
  builtIn('a4-21up', 'A4 Sheet · 21 per page', {
    description: '63.5×38.1mm sticker sheets (Avery L7160 style)', width: 63.5, height: 38.1, layout: 'SHEET',
    marginTop: 15.1, marginLeft: 7.2, gapX: 2.5, gapY: 0,
    fields: on('name', 'barcode', 'barcodeText', 'sku', 'price'),
  }),
  builtIn('qr-50x50', 'QR Label 50×50mm', {
    description: 'Scannable QR with name and price', width: 50, height: 50,
    fields: on('name', 'qr', 'barcodeText', 'price'),
  }),
];

const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Makes any stored/edited settings object safe to render. */
export function normalizeSettings(raw: Partial<LabelSettings> | Record<string, unknown> | null | undefined): LabelSettings {
  const r = (raw ?? {}) as Partial<LabelSettings>;
  const d = defaultLabelSettings();
  const fields = { ...ALL_OFF } as LabelFields;
  const src = (r.fields ?? d.fields) as Partial<LabelFields>;
  (Object.keys(ALL_OFF) as LabelFieldKey[]).forEach(k => { fields[k] = src[k] === true; });
  if (fields.qr && fields.barcode) fields.qr = false;
  const layout: LabelLayout = r.layout === 'SHEET' ? 'SHEET' : 'ROLL';
  return {
    description: typeof r.description === 'string' ? r.description : '',
    width: num(r.width, d.width, 15, 200),
    height: num(r.height, d.height, 10, 150),
    layout,
    columns: layout === 'ROLL' ? Math.round(num(r.columns, 1, 1, 3)) : 1,
    gapX: num(r.gapX, d.gapX, 0, 20),
    gapY: num(r.gapY, d.gapY, 0, 20),
    marginTop: num(r.marginTop, d.marginTop, 0, 40),
    marginLeft: num(r.marginLeft, d.marginLeft, 0, 40),
    format: FORMAT_OPTIONS.some(f => f.value === r.format) ? (r.format as BarcodeFormat) : 'AUTO',
    contentScale: Math.round(num(r.contentScale, 1, MIN_SCALE, MAX_SCALE) * 100) / 100,
    outline: r.outline === true,
    fields,
  };
}

export function templateFromSaved(t: PrintTemplate): LabelTemplate {
  return { ...normalizeSettings(t.settings), key: `saved:${t.id}`, id: t.id, name: t.name, builtIn: false, isDefault: t.isDefault, updatedAt: t.updatedAt || t.createdAt };
}

export const sizeLabel = (s: Pick<LabelSettings, 'width' | 'height'>) => `${+s.width.toFixed(1)}×${+s.height.toFixed(1)}mm`;
export const layoutLabel = (s: Pick<LabelSettings, 'layout' | 'columns'>) =>
  s.layout === 'SHEET' ? 'A4 sheet' : s.columns > 1 ? `${s.columns}-up roll` : 'Thermal roll';

// ── Page geometry ────────────────────────────────────────────────────────────

const A4 = { w: 210, h: 297 };

export interface SheetMetrics {
  pageW: number; pageH: number; cols: number; rows: number; perPage: number; padTop: number; padLeft: number;
}

export function sheetMetrics(s: LabelSettings): SheetMetrics {
  if (s.layout === 'ROLL') {
    const cols = s.columns;
    return { pageW: cols * s.width + (cols - 1) * s.gapX, pageH: s.height, cols, rows: 1, perPage: cols, padTop: 0, padLeft: 0 };
  }
  const usableW = A4.w - s.marginLeft * 2;
  const usableH = A4.h - s.marginTop * 2;
  const cols = Math.max(1, Math.floor((usableW + s.gapX) / (s.width + s.gapX)));
  const rows = Math.max(1, Math.floor((usableH + s.gapY) / (s.height + s.gapY)));
  return { pageW: A4.w, pageH: A4.h, cols, rows, perPage: cols * rows, padTop: s.marginTop, padLeft: s.marginLeft };
}

// ── Label data ───────────────────────────────────────────────────────────────

export interface BarcodeOption {
  id: string;
  label: string;    // e.g. "Piece · 6291041500213"
  unit?: string;
  value: string;    // what gets encoded
  price?: number;
  source: 'barcode' | 'unit' | 'sku';
}

export interface QueueItem {
  key: string;
  productId?: number;
  name: string;
  sku?: string;
  brand?: string;
  /** Product › barcode type (e.g. "EAN-13"), used by the AUTO format. */
  symbology?: string;
  qty: number;
  optionId: string;
  options: BarcodeOption[];
  /** Where it came from, e.g. "PI-0012". */
  origin?: string;
}

export interface LabelData {
  name: string; brand?: string; sku?: string; unit?: string; price?: number; value: string; symbology?: string; source: BarcodeOption['source'];
}

export function barcodeOptions(p: Product): BarcodeOption[] {
  const opts: BarcodeOption[] = [];
  const base = p.barcode?.trim();
  if (base) opts.push({ id: 'base', label: `${p.defaultUnit || 'Default'} · ${base}`, unit: p.defaultUnit, value: base, price: p.sellingPrice, source: 'barcode' });
  (p.units ?? []).forEach((u, i) => {
    const code = u.barcode?.trim();
    if (!code || code === base) return;
    opts.push({ id: `unit-${u.id ?? i}`, label: `${u.unit || `Unit ${i + 1}`} · ${code}`, unit: u.unit, value: code, price: u.sellingPrice || p.sellingPrice, source: 'unit' });
  });
  if (opts.length === 0 && p.sku?.trim()) {
    opts.push({ id: 'sku', label: `SKU · ${p.sku}`, unit: p.defaultUnit, value: p.sku.trim(), price: p.sellingPrice, source: 'sku' });
  }
  return opts;
}

/** A print-queue row for `p`, or null when it has neither a barcode nor a SKU. */
export function queueItemFor(p: Product, qty = 1, opts: { unit?: string; origin?: string; key?: string } = {}): QueueItem | null {
  const options = barcodeOptions(p);
  if (options.length === 0) return null;
  const wanted = opts.unit?.trim().toLowerCase();
  const match = wanted ? options.find(o => o.unit?.trim().toLowerCase() === wanted) : undefined;
  return {
    key: opts.key ?? `p${p.id}:${(match ?? options[0]).id}`,
    productId: p.id,
    name: p.name,
    sku: p.sku,
    brand: p.brand,
    symbology: p.barcodeTemplate,
    qty: Math.max(1, Math.round(qty)),
    optionId: (match ?? options[0]).id,
    options,
    origin: opts.origin,
  };
}

export function labelDataOf(item: QueueItem): LabelData {
  const o = item.options.find(x => x.id === item.optionId) ?? item.options[0];
  return { name: item.name, brand: item.brand, sku: item.sku, unit: o?.unit, price: o?.price, value: o?.value ?? '', symbology: item.symbology, source: o?.source ?? 'sku' };
}

export function sampleLabelData(format: BarcodeFormat): LabelData {
  return {
    name: 'Whey Protein Isolate 2lb', brand: 'Optimum Nutrition', sku: 'SUP-0012', unit: 'Piece', price: 249,
    value: SAMPLE_VALUES[format] ?? SAMPLE_VALUES.CODE128, source: 'barcode', symbology: 'EAN-13',
  };
}

// Valid (check-digit correct) sample values so the designer preview shows each format.
const SAMPLE_VALUES: Record<BarcodeFormat, string> = {
  AUTO: '6291041500213', CODE128: '6291041500213', EAN13: '6291041500213', EAN8: '96385074',
  UPC: '036000291452', CODE39: 'SUP-0012', ITF14: '16291041500210',
};

// ── Barcode rendering ────────────────────────────────────────────────────────

const PX_PER_MM = 96 / 25.4;
/** Narrowest bar that 203dpi thermal printers and handheld scanners read reliably. */
export const MIN_MODULE_MM = 0.19;

const SYMBOLOGY_FORMAT: Record<string, Exclude<BarcodeFormat, 'AUTO'>> = {
  'code 128': 'CODE128', 'code 39': 'CODE39', 'ean-13': 'EAN13', 'ean13': 'EAN13', 'upc-a': 'UPC', 'upc': 'UPC', 'ean-8': 'EAN8',
};

export interface BarcodeRender {
  svg: string;
  format: string;
  /** The template's format could not encode this value, so Code 128 was used instead. */
  fellBack: boolean;
  /** Width of one bar module in mm — below MIN_MODULE_MM the label may not scan. */
  moduleMm: number;
}

const renderCache = new Map<string, BarcodeRender | null>();

function tryEncode(value: string, format: string): SVGSVGElement | null {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  let ok = true;
  try {
    // Quiet zone of 10 modules each side (module = 2 native px) is part of the drawing,
    // so the label's own padding never has to guarantee it.
    JsBarcode(svg, value, { format, width: 2, height: 100, margin: 0, marginLeft: 20, marginRight: 20, displayValue: false, background: 'transparent', valid: (v: boolean) => { ok = v; } });
  } catch {
    ok = false;
  }
  return ok && svg.getAttribute('width') ? svg : null;
}

/**
 * Renders `value` as an SVG string exactly `widthMm` × `heightMm`. Bars are
 * stretched on both axes independently — every bar scales by the same horizontal
 * factor, so the module ratios a scanner reads are preserved exactly.
 */
export function renderBarcode(value: string, format: BarcodeFormat, symbology: string | undefined, widthMm: number, heightMm: number): BarcodeRender | null {
  if (!value) return null;
  const wanted = format === 'AUTO' ? (SYMBOLOGY_FORMAT[(symbology || '').trim().toLowerCase()] ?? 'CODE128') : format;
  const cacheKey = `${value}|${wanted}|${widthMm.toFixed(2)}|${heightMm.toFixed(2)}`;
  if (renderCache.has(cacheKey)) return renderCache.get(cacheKey)!;

  let used: string = wanted;
  let svg = tryEncode(value, wanted);
  if (!svg && wanted !== 'CODE128') { used = 'CODE128'; svg = tryEncode(value, 'CODE128'); }

  let result: BarcodeRender | null = null;
  if (svg) {
    const nativeW = Number.parseFloat(svg.getAttribute('width') || '0');
    const nativeH = Number.parseFloat(svg.getAttribute('height') || '0');
    svg.setAttribute('viewBox', `0 0 ${nativeW} ${nativeH}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('width', `${widthMm}mm`);
    svg.setAttribute('height', `${heightMm}mm`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.removeAttribute('style');
    svg.setAttribute('style', 'display:block');
    result = { svg: svg.outerHTML, format: used, fellBack: used !== wanted, moduleMm: widthMm / (nativeW / 2) };
  }
  if (renderCache.size > 400) renderCache.clear();
  renderCache.set(cacheKey, result);
  return result;
}

// ── Label layout ─────────────────────────────────────────────────────────────

const PAD_MM = 1.5;
const LINE = 1.18;

interface LabelLayoutPlan {
  padMm: number;
  font: { company: number; name: number; meta: number; value: number; price: number }; // px
  codeW: number;
  codeH: number;  // mm; for QR, the square side
}

/** Sizes every row so the enabled fields fill — but never overflow — the label. */
function planLayout(s: LabelSettings): LabelLayoutPlan {
  const f = s.fields;
  const k = s.contentScale;
  const small = s.height <= 25;
  const px = (v: number, min: number) => Math.max(min, Math.round(v * k * 10) / 10);
  const font = {
    company: px(small ? 6.5 : 7.5, 5),
    name: px(small ? 8 : s.height >= 45 ? 11 : 9.5, 6),
    meta: px(small ? 6.5 : 7.5, 5),
    value: px(small ? 7.5 : 9, 5.5),
    price: px(small ? 10 : s.height >= 45 ? 14 : 12, 7),
  };
  const toMm = (fontPx: number) => (fontPx * LINE) / PX_PER_MM;
  const textRows =
    (f.company ? toMm(font.company) : 0) +
    (f.name ? toMm(font.name) : 0) +
    (f.brand ? toMm(font.meta) : 0) +
    ((f.barcode || f.qr) && f.barcodeText ? toMm(font.value) + 0.3 : 0) +
    (f.sku || f.unit ? toMm(font.meta) : 0) +
    (f.price ? toMm(font.price) : 0);
  const rowsCount = [f.company, f.name, f.brand, f.barcode || f.qr, f.sku || f.unit, f.price].filter(Boolean).length;
  const free = s.height - PAD_MM * 2 - textRows - Math.max(0, rowsCount - 1) * 0.5;
  const innerW = s.width - PAD_MM * 2;

  if (f.qr) {
    const side = Math.max(6, Math.min(innerW, free, s.height * 0.62 * k));
    return { padMm: PAD_MM, font, codeW: side, codeH: side };
  }
  const tallest = s.height < 30 ? 13 : s.height < 45 ? 17 : 24;
  return {
    padMm: PAD_MM,
    font,
    codeW: Math.max(10, Math.min(innerW, s.width * 0.88 * Math.min(1, k + 0.05))),
    codeH: Math.max(4, Math.min(free, tallest * k)),
  };
}

// The AED mark is a CSS mask so it inherits the text colour. The URL must be
// absolute: the print frame is about:blank and can't resolve relative assets.
const absoluteAedUrl = () => new URL(aedSymbolUrl, window.location.href).href;

function Price({ amount, currencyCode }: { amount: number; currencyCode: CurrencyCode }) {
  const def = CURRENCIES.find(c => c.code === currencyCode);
  const value = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (def?.hasImageGlyph) {
    const url = `url("${absoluteAedUrl()}")`;
    return (
      <>
        <span role="img" aria-label={currencyCode} style={{
          display: 'inline-block', width: '0.95em', height: '0.8em', marginRight: '0.15em', verticalAlign: '-0.06em',
          backgroundColor: 'currentColor', WebkitMaskImage: url, maskImage: url, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain',
        }} />
        {value}
      </>
    );
  }
  return <>{def?.textPrefix ?? `${currencyCode} `}{value}</>;
}

const ellipsis: React.CSSProperties = { width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/** One physical label at true size (mm). Pure — safe for renderToStaticMarkup. */
export function LabelView({ settings: s, data, companyName, currencyCode, outline }: {
  settings: LabelSettings;
  data: LabelData;
  companyName: string;
  currencyCode: CurrencyCode;
  /** Draw the label edge (screen previews always do; print only when the template asks). */
  outline?: boolean;
}) {
  const f = s.fields;
  const plan = planLayout(s);
  const code = f.barcode ? renderBarcode(data.value, s.format, data.symbology, plan.codeW, plan.codeH) : null;
  const qr = f.qr && data.value ? buildQrCodeSvg(data.value).replace('<svg ', '<svg width="100%" height="100%" style="display:block" ') : null;
  const metaLine = [f.sku && data.sku ? data.sku : '', f.unit && data.unit ? data.unit : ''].filter(Boolean).join('  ·  ');
  const text = (size: number, extra?: React.CSSProperties): React.CSSProperties => ({ ...ellipsis, fontSize: `${size}px`, lineHeight: LINE, ...extra });

  return (
    <div
      className="bb-label"
      style={{
        boxSizing: 'border-box', width: `${s.width}mm`, height: `${s.height}mm`, padding: `${plan.padMm}mm`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5mm',
        overflow: 'hidden', background: '#fff', color: '#000', textAlign: 'center',
        fontFamily: 'Inter, Arial, Helvetica, sans-serif',
        outline: outline ? '0.2mm dashed #9ca3af' : undefined, outlineOffset: outline ? '-0.1mm' : undefined,
        breakInside: 'avoid', pageBreakInside: 'avoid',
      }}
    >
      {f.company && companyName && <div style={text(plan.font.company, { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' })}>{companyName}</div>}
      {f.name && <div style={text(plan.font.name, { fontWeight: 700 })}>{data.name}</div>}
      {f.brand && data.brand && <div style={text(plan.font.meta, { fontWeight: 500 })}>{data.brand}</div>}

      {(code || qr) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          {code && <div style={{ width: `${plan.codeW}mm`, height: `${plan.codeH}mm` }} dangerouslySetInnerHTML={{ __html: code.svg }} />}
          {/* ~2 modules of white around the symbol so text never touches it (scanner quiet zone). */}
          {qr && <div className="bb-qr" style={{ boxSizing: 'border-box', width: `${plan.codeH}mm`, height: `${plan.codeH}mm`, padding: `${plan.codeH * 0.07}mm` }} dangerouslySetInnerHTML={{ __html: qr }} />}
          {f.barcodeText && (
            <div style={text(plan.font.value, { marginTop: '0.3mm', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 600, letterSpacing: '0.12em' })}>
              {data.value}
            </div>
          )}
        </div>
      )}
      {f.barcode && !code && <div style={text(plan.font.meta, { color: '#b91c1c' })}>No barcode</div>}

      {metaLine && <div style={text(plan.font.meta)}>{metaLine}</div>}
      {f.price && data.price != null && (
        <div style={text(plan.font.price, { fontWeight: 800 })}><Price amount={data.price} currencyCode={currencyCode} /></div>
      )}
    </div>
  );
}

/** Scan-quality warnings for a label, shown next to previews. */
export function labelWarnings(s: LabelSettings, data: LabelData): string[] {
  if (!s.fields.barcode || !data.value) return [];
  const plan = planLayout(s);
  const r = renderBarcode(data.value, s.format, data.symbology, plan.codeW, plan.codeH);
  const out: string[] = [];
  if (!r) out.push(`"${data.value}" can't be encoded as a barcode.`);
  else {
    if (r.fellBack) out.push(`"${data.value}" isn't a valid ${FORMAT_OPTIONS.find(o => o.value === s.format)?.label ?? s.format} — printed as Code 128.`);
    if (r.moduleMm < MIN_MODULE_MM) out.push('Bars are very thin at this size — use a wider label or a shorter code so scanners can read it.');
  }
  return out;
}

// ── Printing ─────────────────────────────────────────────────────────────────

export interface PrintLabelsOptions {
  settings: LabelSettings;
  items: QueueItem[];
  companyName: string;
  currencyCode: CurrencyCode;
  /** SHEET only: leave this many positions empty at the start of the first sheet. */
  skip?: number;
  title?: string;
}

/**
 * The print document: roll layouts put one row of labels on each page at the
 * exact label size; sheet layouts tile A4 pages.
 */
export function buildLabelsHtml(opts: PrintLabelsOptions): { html: string; labelCount: number; pageW: number; pageH: number } {
  const s = opts.settings;
  const m = sheetMetrics(s);
  const skip = s.layout === 'SHEET' ? Math.max(0, Math.min(opts.skip ?? 0, m.perPage - 1)) : 0;

  // Render each distinct item once, then repeat its markup.
  const cells: string[] = Array.from({ length: skip }, () => '<div></div>');
  opts.items.forEach(item => {
    const html = renderToStaticMarkup(
      <LabelView settings={s} data={labelDataOf(item)} companyName={opts.companyName} currencyCode={opts.currencyCode} outline={s.outline} />,
    );
    for (let i = 0; i < item.qty; i++) cells.push(html);
  });
  const labelCount = cells.length - skip;

  const pages: string[] = [];
  for (let i = 0; i < cells.length; i += m.perPage) pages.push(`<section class="sheet"><div class="page">${cells.slice(i, i + m.perPage).join('')}</div></section>`);

  // Roll labels take the printer's own paper size, centred on it: a custom
  // @page size the destination can't honour makes Chrome fall back to Letter
  // with margins, where it prints its date/title/URL/page-number header and
  // footer. On a thermal printer the paper is the label, so it fills it.
  const roll = s.layout === 'ROLL';
  const pageSize = roll ? 'auto' : `${m.pageW}mm ${m.pageH}mm`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${(opts.title ?? 'Barcode labels').replace(/</g, '&lt;')}</title><style>
    @page { size: ${pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page {
      width: ${m.pageW}mm; height: ${m.pageH}mm; overflow: hidden;
      padding: ${m.padTop}mm 0 0 ${m.padLeft}mm;
      display: grid; grid-template-columns: repeat(${m.cols}, ${s.width}mm); grid-auto-rows: ${s.height}mm;
      column-gap: ${s.gapX}mm; row-gap: ${roll ? 0 : s.gapY}mm; align-content: start;
    }
    .sheet { ${roll ? 'width: 100vw; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center;' : ''} break-after: page; page-break-after: always; }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    .bb-qr svg { width: 100%; height: 100%; display: block; }
  </style></head><body>${pages.join('')}</body></html>`;

  return { html, labelCount, pageW: m.pageW, pageH: m.pageH };
}

/**
 * Prints every label from a hidden in-page frame, so only the browser's print
 * dialog appears. Resolves to the number of labels sent.
 */
export async function printLabels(opts: PrintLabelsOptions): Promise<number> {
  const { html, labelCount, pageW, pageH } = buildLabelsHtml(opts);
  if (labelCount === 0) return 0;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', left: '-10000px', top: '0', width: `${pageW}mm`, height: `${pageH}mm`, border: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Give the mask image (currency mark) a moment to load before the dialog snapshots the page.
  await new Promise(r => setTimeout(r, 250));
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  setTimeout(() => { if (frame.isConnected) frame.remove(); }, 60_000);
  return labelCount;
}
