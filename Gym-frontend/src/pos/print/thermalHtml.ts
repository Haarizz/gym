// 58mm / 80mm receipt and report HTML for browser printing (and the on-screen
// preview). Monospace-free, inline-styled: the print frame has no app CSS.

import JsBarcode from "jsbarcode";
import { buildQrCodeSvg } from "../../utils/company-details";
import { num } from "../pricing";
import type { ReceiptModel, ReportDoc } from "./receiptModel";

export type ThermalWidth = 58 | 80;

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const nl2br = (v: string) => esc(v).replace(/\n/g, "<br/>");

export function barcodeSvg(value: string, width: ThermalWidth): string {
  if (typeof document === "undefined" || !value) return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: "CODE128", displayValue: true, fontSize: 12, height: 40, margin: 0, width: width === 58 ? 1.2 : 1.6 });
    return svg.outerHTML;
  } catch {
    return "";
  }
}

function styles(width: ThermalWidth, scale: number) {
  const base = (width === 58 ? 10.5 : 12) * (scale || 1);
  return `
  @page{size:${width}mm auto;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  .r{width:${width}mm;padding:3mm ${width === 58 ? 2 : 3}mm 6mm;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:${base}px;line-height:1.35}
  .c{text-align:center}
  .b{font-weight:700}
  .logo{display:block;margin:0 auto 4px;max-width:60%;max-height:22mm;object-fit:contain}
  .name{font-size:${base * 1.35}px;font-weight:800;letter-spacing:.2px}
  .muted{color:#333}
  .title{font-size:${base * 1.15}px;font-weight:800;letter-spacing:1px;margin:6px 0 2px}
  .copy{font-weight:800;border:1px dashed #000;padding:2px 4px;display:inline-block;margin-top:3px}
  hr{border:0;border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;gap:6px}
  .row>span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}
  .row>span:last-child{white-space:nowrap;text-align:right}
  .ind{padding-left:8px}
  .item{margin:4px 0}
  .total{font-size:${base * 1.45}px;font-weight:800;margin:4px 0}
  .sec{font-weight:800;margin:6px 0 2px;text-transform:uppercase;letter-spacing:.5px}
  .qr{width:28mm;height:28mm;margin:4px auto 0}
  .qr svg{width:100%;height:100%}
  .bc{text-align:center;margin-top:6px}
  .bc svg{max-width:100%;height:auto}
  .foot{margin-top:6px;white-space:pre-line}
  `;
}

function header(company: ReceiptModel["company"], t: ReceiptModel["template"], title: string, isReprint: boolean) {
  const parts: string[] = [];
  if (t.showLogo && company.logo) parts.push(`<img class="logo" src="${esc(company.logo)}" alt=""/>`);
  parts.push(`<div class="c name">${esc(company.name)}</div>`);
  if (t.headerText) parts.push(`<div class="c">${nl2br(t.headerText)}</div>`);
  if (t.showCompanyDetails) {
    if (company.address) parts.push(`<div class="c muted">${esc(company.address)}</div>`);
    const contact = [company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join(" · ");
    if (contact) parts.push(`<div class="c muted">${esc(contact)}</div>`);
  }
  if (t.showTrn && company.trn) parts.push(`<div class="c b">TRN: ${esc(company.trn)}</div>`);
  parts.push(`<div class="c title">${esc(title)}</div>`);
  if (isReprint) parts.push(`<div class="c"><span class="copy">*** COPY / REPRINT ***</span></div>`);
  return parts.join("");
}

const row = (l: string, r: string, cls = "") => `<div class="row ${cls}"><span>${esc(l)}</span><span>${esc(r)}</span></div>`;

export function receiptHtmlBody(rc: ReceiptModel, width: ThermalWidth): string {
  const t = rc.template;
  const cur = rc.currency;
  const m = (n: number | null | undefined) => `${cur} ${num(n)}`;
  const out: string[] = [];
  out.push(header(rc.company, t, rc.title, rc.isReprint));
  out.push("<hr/>");
  out.push(row(rc.kind === "RETURN" ? "Credit note no." : "Invoice no.", rc.number));
  if (rc.reference) out.push(row("Against invoice", rc.reference));
  out.push(row("Date", rc.dateTime));
  if (t.showCashier && rc.cashier) out.push(row("Cashier", rc.cashier));
  if (t.showTerminal && rc.terminal) out.push(row("Terminal", rc.terminal));
  out.push("<hr/>");

  for (const l of rc.lines) {
    out.push(`<div class="item"><div class="b">${esc(`${l.qty} × ${l.name}`)}</div>`);
    if (l.discount > 0) {
      out.push(row(`@ ${num(l.unitPrice)}`, m(l.gross), "ind"));
      out.push(row(`Discount${l.discountPercent > 0 ? ` (${num(l.discountPercent)}%)` : ""}`, `- ${m(l.discount)}`, "ind"));
      out.push(row("Net", m(l.amount), "ind"));
    } else {
      out.push(row(`@ ${num(l.unitPrice)}`, m(l.amount), "ind"));
    }
    if (t.showItemSku && l.sku) out.push(`<div class="ind muted">SKU: ${esc(l.sku)}</div>`);
    if (t.showItemVat && rc.hasTax && l.vatRate != null) out.push(`<div class="ind muted">VAT ${num(l.vatRate)}%</div>`);
    if (l.returnedQty > 0) out.push(`<div class="ind muted">Returned: ${l.returnedQty}</div>`);
    out.push("</div>");
  }
  out.push("<hr/>");
  out.push(row("Subtotal", m(rc.subtotal)));
  if (rc.discount > 0) out.push(row("Discount", `- ${m(rc.discount)}`));
  if (rc.promo) out.push(row(rc.promo.label, `- ${m(rc.promo.amount)}`));
  if (rc.hasTax && t.showVatSummary) {
    out.push(row(rc.taxInclusive ? "Taxable amount" : "Net before VAT", m(rc.taxable)));
    out.push(row(rc.taxInclusive ? "VAT (included)" : "VAT", m(rc.vat)));
  }
  out.push(`<div class="row total"><span>${rc.kind === "RETURN" ? "REFUND" : "TOTAL"}</span><span>${esc(m(rc.total))}</span></div>`);

  if (t.showPaymentDetails && rc.payments.length > 0) {
    out.push("<hr/>");
    rc.payments.forEach((p) => out.push(row(p.label, m(p.amount))));
    if (rc.tendered != null && rc.tendered > 0 && rc.change != null && rc.change > 0) {
      out.push(row("Tendered", m(rc.tendered)));
      out.push(row("Change", m(rc.change), "b"));
    }
  }
  const saved = rc.discount + (rc.promo?.amount ?? 0);
  if (t.showSavings && rc.kind === "SALE" && saved > 0) out.push(`<div class="c b" style="margin-top:4px">You saved ${esc(m(saved))}</div>`);
  if (rc.refunded > 0) out.push(row("Returned so far", `- ${m(rc.refunded)}`));

  if (t.showCustomer && rc.customer) {
    out.push("<hr/>");
    out.push(`<div class="sec">Customer</div>`);
    out.push(row("Name", rc.customer.name));
    if (rc.customer.code) out.push(row("Member ID", rc.customer.code));
    if (rc.customer.phone) out.push(row("Mobile", rc.customer.phone));
  }
  if (t.showCreditBalance && rc.creditAmount > 0) {
    out.push("<hr/>");
    out.push(`<div class="sec">Credit account</div>`);
    out.push(row("Charged to account", m(rc.creditAmount)));
    out.push(row("Outstanding on this invoice", m(rc.creditOutstanding), "b"));
  }
  if (rc.notes) out.push(`<hr/><div>${nl2br(rc.notes)}</div>`);
  if (t.showQrCode) out.push(`<hr/><div class="qr">${buildQrCodeSvg(rc.qrPayload)}</div>`);
  if (t.showBarcode && rc.barcode) out.push(`<div class="bc">${barcodeSvg(rc.barcode, width)}</div>`);
  if (t.showReturnPolicy && t.returnPolicyText) out.push(`<div class="c foot muted">${esc(t.returnPolicyText)}</div>`);
  if (t.footerText) out.push(`<div class="c foot">${esc(t.footerText)}</div>`);
  return `<div class="r">${out.join("")}</div>`;
}

export function reportHtmlBody(doc: ReportDoc, width: ThermalWidth): string {
  const out: string[] = [];
  out.push(header(doc.company, { ...doc.template, headerText: "" }, doc.title, false));
  out.push("<hr/>");
  doc.meta.forEach((r) => out.push(row(r.label, r.value)));
  for (const s of doc.sections) {
    if (s.rows.length === 0) continue;
    out.push("<hr/>");
    out.push(`<div class="sec">${esc(s.heading)}</div>`);
    s.rows.forEach((r) => out.push(row(r.label, r.value, `${r.bold ? "b" : ""} ${r.indent ? "ind" : ""}`)));
  }
  if (doc.barcode) out.push(`<hr/><div class="bc">${barcodeSvg(doc.barcode, width)}</div>`);
  if (doc.footer) out.push(`<div class="c foot muted">${esc(doc.footer)}</div>`);
  return `<div class="r">${out.join("")}</div>`;
}

export function thermalDocument(body: string, width: ThermalWidth, title: string, scale = 1): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${styles(width, scale)}</style></head><body>${body}</body></html>`;
}

/** Prints an HTML document through a hidden frame (only the print dialog shows). */
export async function printViaBrowser(html: string, copies = 1): Promise<void> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "80mm", height: "200mm", border: "0", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  const doc = win.document;
  const body = copies > 1
    ? html.replace(/<body>([\s\S]*)<\/body>/, (_, inner: string) => `<body>${Array.from({ length: copies }, () => inner).join('<div style="page-break-after:always"></div>')}</body>`)
    : html;
  doc.open();
  doc.write(body);
  doc.close();
  await Promise.all(Array.from(doc.images).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }))));
  win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 500), { once: true });
  win.focus();
  win.print(); // blocks until the dialog closes in Chromium/Firefox
  // Browsers that never fire afterprint on frames: clean up eventually.
  setTimeout(() => { if (frame.isConnected) frame.remove(); }, 60_000);
}
