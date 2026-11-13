import { printFontReady, withPrintFont } from "./print-font";

/**
 * Renders a complete printable HTML document (the same one Print uses) to an A4 PDF, so an
 * emailed receipt or invoice looks exactly like the printed one — QR code, Arabic name, logo
 * and all. The page is laid out in an off-screen 210mm-wide frame, captured with html2canvas
 * and placed on as many A4 pages as it needs. Libraries load on first use only.
 */

const A4_WIDTH_PX = 794; // 210mm at 96dpi
const A4_W_MM = 210;
const A4_H_MM = 297;

/** Re-encodes every <img> as a data URL first, so the capture never hits a cross-origin image. */
async function inlineImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return;
    try {
      const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        const t = setTimeout(() => reject(new Error("timeout")), 6000);
        i.onload = () => { clearTimeout(t); resolve(i); };
        i.onerror = () => { clearTimeout(t); reject(new Error("load failed")); };
        i.src = img.src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = loaded.naturalWidth || loaded.width || 1;
      canvas.height = loaded.naturalHeight || loaded.height || 1;
      canvas.getContext("2d")?.drawImage(loaded, 0, 0);
      img.src = canvas.toDataURL("image/png");
    } catch {
      // A logo on a host without CORS: hide it rather than fail the whole PDF.
      img.style.visibility = "hidden";
    }
  }));
  await Promise.all(Array.from(doc.images).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => {
    img.onload = () => r();
    img.onerror = () => r();
  }))));
}

// html2canvas 1.4 can't parse modern colour syntax (color-mix(), color(srgb …), oklch(), lab()…) and
// aborts the whole capture. Browsers resolve those to e.g. "color(srgb 0.2 0.4 0.3)", so every
// such computed colour is converted to rgba() through a 1×1 canvas and pinned as an inline style.
const MODERN_COLOR = /\b(?:color|oklch|oklab|lab|lch|color-mix)\(/i;
const MODERN_COLOR_TOKEN = /\b(?:color|oklch|oklab|lab|lch)\((?:[^()]|\([^()]*\))*\)/gi;
const COLOR_PROPS = [
  "color", "background-color", "border-top-color", "border-right-color", "border-bottom-color",
  "border-left-color", "outline-color", "text-decoration-color", "column-rule-color", "fill", "stroke",
];
const LIST_PROPS = ["box-shadow", "text-shadow", "background-image"];

function normalizeColors(doc: Document) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const cache = new Map<string, string>();
  const toRgba = (value: string) => {
    const hit = cache.get(value);
    if (hit) return hit;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const out = `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
    cache.set(value, out);
    return out;
  };
  const win = doc.defaultView;
  if (!win) return;
  for (const el of Array.from(doc.querySelectorAll<HTMLElement | SVGElement>("*"))) {
    const cs = win.getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v && MODERN_COLOR.test(v)) el.style.setProperty(prop, toRgba(v), "important");
    }
    for (const prop of LIST_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v && MODERN_COLOR.test(v)) el.style.setProperty(prop, v.replace(MODERN_COLOR_TOKEN, (m) => toRgba(m)), "important");
    }
  }
}

/**
 * The capture sees the document as a screen would, but these documents are designed for paper:
 * their @media print rules drop the grey backdrop, card shadow and screen padding and set the
 * page margins. Re-applies every print-only rule unconditionally (after the screen rules, so it
 * wins), so the PDF matches the printed page. @page rules are skipped — the PDF sets the page.
 */
function applyPrintStyles(doc: Document) {
  const css: string[] = [];
  const collect = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule || (rule as CSSMediaRule).media) {
        const media = (rule as CSSMediaRule).media?.mediaText?.toLowerCase() ?? "";
        if (media.includes("print") && !media.includes("screen")) {
          for (const inner of Array.from((rule as CSSMediaRule).cssRules)) {
            if (inner.constructor?.name === "CSSPageRule" || inner.cssText.trim().startsWith("@page")) continue;
            css.push(inner.cssText);
          }
        }
      }
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ }
  }
  if (!css.length) return;
  const style = doc.createElement("style");
  style.textContent = css.join("\n");
  (doc.head ?? doc.documentElement).appendChild(style);
}

/**
 * html2canvas draws text letter by letter when letter-spacing is set, which breaks the joined
 * letters of Arabic script (فاتورة came out as separate glyphs). Arabic text gets normal spacing.
 */
function fixArabicSpacing(doc: Document) {
  const win = doc.defaultView;
  if (!win) return;
  const arabic = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>("body *"))) {
    const hasArabic = Array.from(el.childNodes).some((n) => n.nodeType === 3 && arabic.test(n.nodeValue || ""));
    if (hasArabic && win.getComputedStyle(el).letterSpacing !== "normal") {
      el.style.setProperty("letter-spacing", "normal", "important");
    }
  }
}

/** Builds the PDF and returns it as a Blob. */
export async function htmlToPdfBlob(html: string): Promise<Blob> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${A4_WIDTH_PX}px;height:1123px;border:0;opacity:0;pointer-events:none`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(withPrintFont(html.replace(/<script[\s\S]*?<\/script>/gi, "")));
    doc.close();
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") resolve();
      else frame.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 3000);
    });
    applyPrintStyles(doc);
    await printFontReady(doc);
    await inlineImages(doc);
    normalizeColors(doc);
    fixArabicSpacing(doc);

    // Let the content decide its height (print CSS often pins the body to one page).
    const root = doc.documentElement;
    const height = Math.max(root.scrollHeight, doc.body?.scrollHeight ?? 0, 1123);
    frame.style.height = `${height}px`;

    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      windowHeight: height,
      logging: false,
    });

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    // Canvas pixels per mm of page, and the slice of canvas that fills one A4 page.
    const pxPerMm = canvas.width / A4_W_MM;
    const pageHeightPx = Math.floor(A4_H_MM * pxPerMm);
    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - offset);
      // Skip a trailing sliver of white (rounding past the last page).
      if (page > 0 && sliceHeight < 20) break;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const g = slice.getContext("2d", { willReadFrequently: true })!;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, slice.width, slice.height);
      g.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      // A later page that is only white space (the frame's minimum height) is left out.
      if (page > 0 && isBlank(g, slice.width, slice.height)) break;
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W_MM, sliceHeight / pxPerMm, undefined, "FAST");
      offset += sliceHeight;
      page++;
    }
    return pdf.output("blob");
  } finally {
    frame.remove();
  }
}

function isBlank(g: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = g.getImageData(0, 0, w, h).data;
  // Every 7th pixel is plenty to find any ink.
  for (let i = 0; i < data.length; i += 4 * 7) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) return false;
  }
  return true;
}

/** Base64 (no data: prefix) of a Blob. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
