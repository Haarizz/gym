// Raw ESC/POS byte streams for 58/80mm thermal printers, ported from BillBull's
// escPosReceipt.js. Sent byte-for-byte to the printer (local print agent or the
// backend's network relay), bypassing the browser/Windows driver so density,
// cutting, drawer kick, native QR/barcode and logo rasters all work.
//
// Portability rules carried over from BillBull's field fixes on clone printers
// (Xprinter / GPrinter / POS-80C):
//  • no GS L / GS W margin commands — the symmetric margin is a software gutter;
//  • centring is done in software (space padding / full-width rasters), never ESC a 1;
//  • a text line is flushed before any raster; one GS v 0 block per image;
//  • QR module size shrinks until the symbol fits the paper (else nothing prints);
//  • feed-then-cut (GS V 66 n) so the tail clears the blade.

import { num } from "../pricing";
import type { ReceiptModel, ReportDoc } from "./receiptModel";

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  HEAT: [ESC, 0x37, 9, 255, 2],
  FONT_A: [ESC, 0x4d, 0x00],
  CODEPAGE_1252: [ESC, 0x74, 16],
  LINE_SPACING: (n: number) => [ESC, 0x33, n & 0xff],
  BOLD_ON: [ESC, 0x45, 1],
  BOLD_OFF: [ESC, 0x45, 0],
  LEFT: [ESC, 0x61, 0],
  CENTER: [ESC, 0x61, 1],
  SIZE: (w: number, h: number) => [GS, 0x21, (((w - 1) & 7) << 4) | ((h - 1) & 7)],
  SIZE_NORMAL: [GS, 0x21, 0],
  FEED: (n: number) => [ESC, 0x64, n & 0xff],
  FEED_DOTS: (n: number) => [ESC, 0x4a, n & 0xff],
  CUT_FEED: (n: number) => [GS, 0x56, 66, n & 0xff],
  /** ESC p m t1 t2 — pulse drawer pin 2. */
  DRAWER: [ESC, 0x70, 0, 25, 250],
};

const PAPER_DOTS = { 58: 384, 80: 576 } as const;
const PAPER_COLS = { 58: 32, 80: 48 } as const;
const MARGIN = 1;
type Mm = 58 | 80;
const cols = (mm: Mm) => PAPER_COLS[mm] - 2 * MARGIN;
const usableDots = (mm: Mm) => PAPER_DOTS[mm] - 2 * MARGIN * Math.round(PAPER_DOTS[mm] / PAPER_COLS[mm]);
const GUTTER = " ".repeat(MARGIN);

const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x2026: 0x85, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2122: 0x99,
};
const strip = (s: string) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/×/g, "x");

function toBytes(str: string): Uint8Array {
  const s = strip(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = (c >= 0x20 && c <= 0xff) || c === 0x0a ? c : CP1252[c] ?? 0x3f;
  }
  return out;
}

const needsRaster = (str: string) => {
  const s = strip(str);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (!((c >= 0x20 && c <= 0xff) || c === 0x0a || CP1252[c] != null)) return true;
  }
  return false;
};
const hasArabic = (s: string) => /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(s);

class Writer {
  private chunks: Uint8Array[] = [];
  push(b: number[] | Uint8Array) { this.chunks.push(b instanceof Uint8Array ? b : Uint8Array.from(b)); return this; }
  text(s: string) { return this.push(toBytes(s)); }
  line(s = "") { return this.text(s).push([0x0a]); }
  gline(s = "") { return this.line(GUTTER + s); }
  bytes(): Uint8Array {
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of this.chunks) { out.set(c, o); o += c.length; }
    return out;
  }
}

export function fixed(left: string, right: string, width: number): string {
  const l = String(left ?? "");
  const r = String(right ?? "");
  if (!r) return l.slice(0, width);
  const room = Math.max(1, width - r.length - 1);
  const lt = l.length > room ? `${l.slice(0, Math.max(0, room - 1))}…` : l;
  return `${lt}${" ".repeat(Math.max(1, width - lt.length - r.length))}${r}`;
}

export function wrap(text: string, width: number, indent = ""): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  const cap = () => width - (lines.length ? indent.length : 0);
  const flush = () => { lines.push((lines.length ? indent : "") + cur); cur = ""; };
  for (let w of words) {
    while (w.length > cap()) {
      if (cur) flush();
      const head = w.slice(0, cap());
      lines.push((lines.length ? indent : "") + head);
      w = w.slice(head.length);
    }
    const probe = cur ? `${cur} ${w}` : w;
    if (probe.length <= cap()) cur = probe;
    else { flush(); cur = w; }
  }
  if (cur || !lines.length) flush();
  return lines;
}

const center = (text: string, width: number) => {
  const t = text.slice(0, width);
  return " ".repeat(Math.max(0, Math.floor((width - t.length) / 2))) + t;
};

// ── Rasters ───────────────────────────────────────────────────────────────

function pack(bits: Uint8Array, w: number, h: number): Uint8Array {
  const bpr = Math.ceil(w / 8);
  const raster = new Uint8Array(bpr * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bits[y * w + x]) raster[y * bpr + (x >> 3)] |= 0x80 >> (x & 7);
  const out = new Uint8Array(8 + raster.length);
  out.set([GS, 0x76, 0x30, 0x00, bpr & 0xff, (bpr >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff], 0);
  out.set(raster, 8);
  return out;
}

const rasterCache = new Map<string, Promise<Uint8Array>>();

/** Floyd–Steinberg dithered logo, centred inside a full-width bitmap. */
function imageRaster(dataUrl: string, targetDots: number, padTo: number): Promise<Uint8Array> {
  const key = `${targetDots}|${padTo}|${dataUrl}`;
  const hit = rasterCache.get(key);
  if (hit) return hit;
  const job = new Promise<Uint8Array>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const iw = Math.min(targetDots, Math.max(1, img.naturalWidth));
        const h = Math.max(1, Math.round((iw * img.naturalHeight) / Math.max(1, img.naturalWidth)));
        const w = Math.max(iw, padTo);
        const ox = Math.floor((w - iw) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, ox, 0, iw, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const gray = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const o = i * 4;
          const a = data[o + 3] / 255;
          gray[i] = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) * a + 255 * (1 - a);
        }
        const bits = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const old = gray[i];
          const black = old < 128;
          bits[i] = black ? 1 : 0;
          const err = old - (black ? 0 : 255);
          if (x + 1 < w) gray[i + 1] += (err * 7) / 16;
          if (y + 1 < h) {
            if (x > 0) gray[i + w - 1] += (err * 3) / 16;
            gray[i + w] += (err * 5) / 16;
            if (x + 1 < w) gray[i + w + 1] += err / 16;
          }
        }
        resolve(pack(bits, w, h));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
  job.catch(() => rasterCache.delete(key));
  if (rasterCache.size > 8) rasterCache.delete(rasterCache.keys().next().value as string);
  rasterCache.set(key, job);
  return job;
}

/** Arabic / non-Latin-1 text as a crisp full-width bitmap line (canvas handles shaping and RTL). */
function textRaster(text: string, widthDots: number, fontPx: number, bold: boolean): Uint8Array | null {
  try {
    const canvas = document.createElement("canvas");
    const pad = Math.round(fontPx * 0.3);
    canvas.width = widthDots;
    canvas.height = fontPx + pad * 2;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.font = `${bold ? "bold " : ""}${fontPx}px 'Segoe UI', Tahoma, Arial, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.direction = hasArabic(text) ? "rtl" : "ltr";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bits = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < bits.length; i++) {
      const o = i * 4;
      bits[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] < 160 ? 1 : 0;
    }
    return pack(bits, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

// ── Native QR (GS ( k model 2) and Code128 barcode (GS k 73) ───────────────

const QR_CAP_M = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
  711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331];

function qr(data: string, moduleSize: number, maxDots: number): Uint8Array {
  const w = new Writer();
  const bytes = new TextEncoder().encode(data);
  const v = QR_CAP_M.findIndex((c) => bytes.length <= c);
  const modules = 17 + 4 * (v === -1 ? 40 : v + 1);
  const size = Math.max(2, Math.min(moduleSize, Math.floor(maxDots / modules)));
  w.push([GS, 0x28, 0x6b, 4, 0, 0x31, 0x41, 0x32, 0]);
  w.push([GS, 0x28, 0x6b, 3, 0, 0x31, 0x43, size]);
  w.push([GS, 0x28, 0x6b, 3, 0, 0x31, 0x45, 49]);
  const len = bytes.length + 3;
  w.push([GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30]);
  w.push(bytes);
  w.push([GS, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30]);
  return w.bytes();
}

function barcode128(value: string, mm: Mm): Uint8Array | null {
  const v = String(value ?? "").trim();
  if (!v || !/^[\x20-\x7e]+$/.test(v) || v.length > 40) return null;
  const data = toBytes(`{B${v}`);
  const w = new Writer();
  w.push(CMD.CENTER);
  w.push([GS, 0x68, mm === 58 ? 60 : 72]); // height
  w.push([GS, 0x77, 2]);                    // module width
  w.push([GS, 0x48, 2]);                    // HRI below
  w.push([GS, 0x66, 1]);                    // HRI font B
  w.push([GS, 0x6b, 73, data.length]);
  w.push(data);
  w.push([0x0a]);
  w.push(CMD.LEFT);
  return w.bytes();
}

// ── Shared header ─────────────────────────────────────────────────────────

async function header(w: Writer, mm: Mm, rc: Pick<ReceiptModel, "company" | "template">, title: string, isReprint: boolean, extraHeader: string) {
  const width = cols(mm);
  const t = rc.template;
  const c = rc.company;
  const centered = (text: string, bold = false, fontPx = 24) => {
    if (!text) return;
    if (needsRaster(text)) {
      const raster = textRaster(text, PAPER_DOTS[mm], fontPx, bold);
      if (raster) { w.push(raster).push([0x0a]); return; }
    }
    if (bold) w.push(CMD.BOLD_ON);
    wrap(text, width).forEach((l) => w.gline(center(l, width)));
    if (bold) w.push(CMD.BOLD_OFF);
  };
  w.push(CMD.LEFT);
  if (t.showLogo && c.logo) {
    try {
      const raster = await imageRaster(c.logo, Math.round(usableDots(mm) * 0.6), PAPER_DOTS[mm]);
      w.line(" ");
      w.push(raster).push([0x0a]);
    } catch {
      /* logo failed to decode — print without it */
    }
  }
  w.push(CMD.BOLD_ON).push(CMD.SIZE(1, 2));
  wrap(c.name, width).forEach((l) => w.gline(center(l, width)));
  w.push(CMD.SIZE_NORMAL).push(CMD.BOLD_OFF);
  String(extraHeader || "").split("\n").forEach((l) => centered(l.trim(), false, 24));
  if (t.showCompanyDetails) {
    centered(String(c.address || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).join(", "), false, 22);
    if (c.phone) centered(`Tel: ${c.phone}`, false, 22);
  }
  if (t.showTrn && c.trn) centered(`TRN: ${c.trn}`, true, 22);
  w.push(CMD.FEED_DOTS(8));
  centered(title, true);
  if (isReprint) centered("*** COPY / REPRINT ***", true);
  w.push(CMD.FEED_DOTS(6)).gline("-".repeat(width)).push(CMD.FEED_DOTS(6));
}

function finish(w: Writer, mm: Mm, opts: { cut?: boolean; openDrawer?: boolean }) {
  if (opts.openDrawer) w.push(CMD.DRAWER);
  w.push(CMD.FEED(2));
  if (opts.cut !== false) w.push(CMD.CUT_FEED(mm === 58 ? 100 : 120));
  else w.push(CMD.FEED(4));
}

function start(): Writer {
  const w = new Writer();
  w.push(CMD.INIT).push(CMD.HEAT).push(CMD.CODEPAGE_1252).push(CMD.FONT_A).push(CMD.LINE_SPACING(34));
  return w;
}

const mmOf = (paper: string | number): Mm => (String(paper).includes("58") ? 58 : 80);

// ── Documents ─────────────────────────────────────────────────────────────

export async function receiptEscPos(rc: ReceiptModel, paper: string | number, opts: { cut?: boolean; openDrawer?: boolean } = {}): Promise<Uint8Array> {
  const mm = mmOf(paper);
  const width = cols(mm);
  const hr = "-".repeat(width);
  const cur = rc.currency;
  const m = (n: number | null | undefined) => `${cur} ${num(n)}`;
  const t = rc.template;
  const w = start();
  await header(w, mm, rc, rc.title, rc.isReprint, t.headerText);

  w.gline(fixed(rc.kind === "RETURN" ? "Credit note:" : "Invoice:", rc.number, width));
  if (rc.reference) w.gline(fixed("Against:", rc.reference, width));
  w.gline(fixed("Date:", rc.dateTime, width));
  if (t.showCashier && rc.cashier) w.gline(fixed("Cashier:", rc.cashier, width));
  if (t.showTerminal && rc.terminal) w.gline(fixed("Terminal:", rc.terminal, width));
  w.push(CMD.FEED_DOTS(6)).gline(hr).push(CMD.FEED_DOTS(6));

  for (const l of rc.lines) {
    w.push(CMD.BOLD_ON);
    wrap(`${l.qty}x ${l.name}`, width, "   ").forEach((s) => w.gline(s));
    w.push(CMD.BOLD_OFF);
    if (l.discount > 0) {
      w.gline(fixed(` @ ${num(l.unitPrice)}`, m(l.gross), width));
      w.gline(fixed(` Discount${l.discountPercent > 0 ? ` (${num(l.discountPercent)}%)` : ""}`, `- ${m(l.discount)}`, width));
      w.gline(fixed(" Net", m(l.amount), width));
    } else {
      w.gline(fixed(` @ ${num(l.unitPrice)}`, m(l.amount), width));
    }
    if (t.showItemSku && l.sku) w.gline(` SKU: ${l.sku}`.slice(0, width));
    if (t.showItemVat && rc.hasTax && l.vatRate != null) w.gline(` VAT ${num(l.vatRate)}%`);
    if (l.returnedQty > 0) w.gline(` Returned: ${l.returnedQty}`);
    w.push(CMD.FEED_DOTS(6));
  }
  w.gline(hr);
  w.gline(fixed("Subtotal:", m(rc.subtotal), width));
  if (rc.discount > 0) w.gline(fixed("Discount:", `- ${m(rc.discount)}`, width));
  if (rc.promo) w.gline(fixed(`${rc.promo.label}:`, `- ${m(rc.promo.amount)}`, width));
  if (rc.hasTax && t.showVatSummary) {
    w.gline(fixed(rc.taxInclusive ? "Taxable amount:" : "Net before VAT:", m(rc.taxable), width));
    w.gline(fixed(rc.taxInclusive ? "VAT (included):" : "VAT:", m(rc.vat), width));
  }
  w.gline(hr).push(CMD.FEED_DOTS(10));
  w.push(CMD.BOLD_ON).push(CMD.SIZE(1, 2));
  w.gline(fixed(rc.kind === "RETURN" ? "REFUND:" : "TOTAL:", m(rc.total), width));
  w.push(CMD.SIZE_NORMAL).push(CMD.BOLD_OFF).push(CMD.FEED_DOTS(10)).gline(hr);

  if (t.showPaymentDetails && rc.payments.length > 0) {
    rc.payments.forEach((p) => w.gline(fixed(`${p.label}:`, m(p.amount), width)));
    if (rc.tendered != null && rc.tendered > 0 && rc.change != null && rc.change > 0) {
      w.gline(fixed("Tendered:", m(rc.tendered), width));
      w.push(CMD.BOLD_ON).gline(fixed("Change:", m(rc.change), width)).push(CMD.BOLD_OFF);
    }
    w.gline(hr);
  }
  const saved = rc.discount + (rc.promo?.amount ?? 0);
  if (t.showSavings && rc.kind === "SALE" && saved > 0) {
    w.push(CMD.BOLD_ON).gline(center(`You saved ${m(saved)}`, width)).push(CMD.BOLD_OFF);
  }
  if (rc.refunded > 0) w.gline(fixed("Returned so far:", `- ${m(rc.refunded)}`, width));
  if (t.showCustomer && rc.customer) {
    w.push(CMD.BOLD_ON).gline("CUSTOMER").push(CMD.BOLD_OFF);
    w.gline(fixed("Name:", rc.customer.name, width));
    if (rc.customer.code) w.gline(fixed("Member ID:", rc.customer.code, width));
    if (rc.customer.phone) w.gline(fixed("Mobile:", rc.customer.phone, width));
    w.gline(hr);
  }
  if (t.showCreditBalance && rc.creditAmount > 0) {
    w.push(CMD.BOLD_ON).gline("CREDIT ACCOUNT").push(CMD.BOLD_OFF);
    w.gline(fixed("Charged to account:", m(rc.creditAmount), width));
    w.push(CMD.BOLD_ON).gline(fixed("Outstanding:", m(rc.creditOutstanding), width)).push(CMD.BOLD_OFF);
    w.gline(hr);
  }
  if (rc.notes) wrap(rc.notes, width).forEach((l) => w.gline(l));
  if (t.showQrCode && rc.qrPayload) {
    w.push(CMD.CENTER).push(CMD.FEED(1));
    w.push(qr(rc.qrPayload, mm === 58 ? 3 : 4, usableDots(mm)));
    w.push(CMD.LEFT);
  }
  if (t.showBarcode && rc.barcode) {
    const bc = barcode128(rc.barcode, mm);
    if (bc) w.push(CMD.FEED(1)).push(bc);
  }
  if (t.showReturnPolicy && t.returnPolicyText) wrap(t.returnPolicyText, width).forEach((l) => w.gline(center(l, width)));
  if (t.footerText) {
    w.push(CMD.FEED(1));
    t.footerText.split("\n").forEach((line) => {
      if (needsRaster(line)) {
        const raster = textRaster(line, PAPER_DOTS[mm], 20, false);
        if (raster) { w.push(raster).push([0x0a]); return; }
      }
      wrap(line, width).forEach((l) => w.gline(center(l, width)));
    });
  }
  finish(w, mm, opts);
  return w.bytes();
}

export async function reportEscPos(doc: ReportDoc, paper: string | number, opts: { cut?: boolean } = {}): Promise<Uint8Array> {
  const mm = mmOf(paper);
  const width = cols(mm);
  const hr = "-".repeat(width);
  const w = start();
  w.push(CMD.LINE_SPACING(36));
  await header(w, mm, doc, doc.title, false, "");
  doc.meta.forEach((r) => w.gline(fixed(`${r.label}:`, r.value, width)));
  for (const s of doc.sections) {
    if (s.rows.length === 0) continue;
    w.push(CMD.FEED_DOTS(6)).gline(hr);
    w.push(CMD.BOLD_ON).gline(s.heading.toUpperCase()).push(CMD.BOLD_OFF);
    for (const r of s.rows) {
      if (r.bold) w.push(CMD.BOLD_ON);
      w.gline(fixed(`${r.indent ? "  " : ""}${r.label}`, r.value, width));
      if (r.bold) w.push(CMD.BOLD_OFF);
    }
  }
  w.gline(hr);
  if (doc.barcode) {
    const bc = barcode128(doc.barcode, mm);
    if (bc) w.push(bc);
  }
  if (doc.footer) wrap(doc.footer, width).forEach((l) => w.gline(center(l, width)));
  finish(w, mm, opts);
  return w.bytes();
}

export function drawerKickEscPos(): Uint8Array {
  return Uint8Array.from([...CMD.INIT, ...CMD.DRAWER]);
}

export function testPageEscPos(printerName: string, paper: string | number, openDrawer = false): Uint8Array {
  const mm = mmOf(paper);
  const width = cols(mm);
  const w = start();
  w.push(CMD.BOLD_ON).push(CMD.SIZE(2, 2)).gline(center("GymBios", Math.floor(width / 2))).push(CMD.SIZE_NORMAL).push(CMD.BOLD_OFF);
  w.gline(center("POS PRINTER TEST", width));
  w.gline("-".repeat(width));
  w.gline(fixed("Printer:", printerName, width));
  w.gline(fixed("Paper:", `${mm}mm (${width} cols)`, width));
  w.gline(fixed("Time:", new Date().toLocaleString("en-GB"), width));
  w.gline("-".repeat(width));
  w.gline("0123456789".repeat(Math.ceil(width / 10)).slice(0, width));
  w.push(CMD.BOLD_ON).gline("Bold text").push(CMD.BOLD_OFF);
  w.push(CMD.CENTER).push(qr("GymBios POS test", 4, usableDots(mm))).push(CMD.LEFT);
  const bc = barcode128("TEST-1234", mm);
  if (bc) w.push(bc);
  finish(w, mm, { openDrawer });
  return w.bytes();
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ── Plain-text fallbacks (agent /print/receipt, for drivers that refuse RAW) ─

export function receiptText(rc: ReceiptModel, paper: string | number): string {
  const width = cols(mmOf(paper));
  const hr = "-".repeat(width);
  const cur = rc.currency;
  const m = (n: number | null | undefined) => `${cur} ${num(n)}`;
  const out: string[] = [center(rc.company.name, width)];
  if (rc.template.showTrn && rc.company.trn) out.push(center(`TRN: ${rc.company.trn}`, width));
  out.push(center(rc.title, width));
  if (rc.isReprint) out.push(center("*** COPY / REPRINT ***", width));
  out.push(hr, fixed("No:", rc.number, width), fixed("Date:", rc.dateTime, width));
  if (rc.cashier) out.push(fixed("Cashier:", rc.cashier, width));
  out.push(hr);
  rc.lines.forEach((l) => {
    out.push(...wrap(`${l.qty}x ${l.name}`, width, "   "));
    out.push(fixed(` @ ${num(l.unitPrice)}`, m(l.amount), width));
  });
  out.push(hr, fixed("Subtotal:", m(rc.subtotal), width));
  if (rc.discount > 0) out.push(fixed("Discount:", `- ${m(rc.discount)}`, width));
  if (rc.promo) out.push(fixed(`${rc.promo.label}:`, `- ${m(rc.promo.amount)}`, width));
  if (rc.hasTax) out.push(fixed("VAT:", m(rc.vat), width));
  out.push(fixed("TOTAL:", m(rc.total), width), hr);
  rc.payments.forEach((p) => out.push(fixed(`${p.label}:`, m(p.amount), width)));
  if (rc.change && rc.change > 0) out.push(fixed("Change:", m(rc.change), width));
  if (rc.template.footerText) out.push(hr, ...rc.template.footerText.split("\n").map((l) => center(l, width)));
  return out.join("\n");
}

export function reportText(doc: ReportDoc, paper: string | number): string {
  const width = cols(mmOf(paper));
  const hr = "-".repeat(width);
  const out: string[] = [center(doc.company.name, width), center(doc.title, width), hr];
  doc.meta.forEach((r) => out.push(fixed(`${r.label}:`, r.value, width)));
  doc.sections.forEach((s) => {
    if (s.rows.length === 0) return;
    out.push(hr, s.heading.toUpperCase());
    s.rows.forEach((r) => out.push(fixed(`${r.indent ? "  " : ""}${r.label}`, r.value, width)));
  });
  if (doc.footer) out.push(hr, center(doc.footer, width));
  return out.join("\n");
}
