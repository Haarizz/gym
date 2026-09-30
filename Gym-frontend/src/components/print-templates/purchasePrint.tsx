import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCompanyDetails, type CompanyDetails } from '../../utils/company-details';
import { CURRENCIES, type CurrencyCode } from '../../utils/currency';
import { financialSettingsService } from '../../utils/supabase/financial-settings-service';
import { printTemplateService } from '../../utils/supabase/print-template-service';
import type { PurchaseOrder, Supplier } from '../../utils/supabase/purchase-service';
import type { SupplierBill } from '../../utils/supabase/supplier-bill-service';
import type { Product } from '../../utils/supabase/products-service';
import { balanceOf, displayDate, lineAmounts, priorityMeta } from '../purchase/purchaseInvoiceUtils';
import {
  DocumentView, PAPER_MM, docTypeMeta, resolveSettings,
  type DocTemplateSettings, type DocType, type PrintDocument, type PrintParty,
} from './documentTemplate';

// Prints a Purchase Order / Purchase Invoice with its default print template
// (Sales & Purchases › Settings › Print Templates). The header always shows the
// company details and currency of the branch the document belongs to.

type SupplierInfo = Partial<Pick<Supplier, 'contactPerson' | 'phone' | 'email' | 'address' | 'city' | 'country' | 'taxId' | 'paymentTerms'>>;
/** Catalog fields a line can print (image, brand, barcode, description) — looked up by productId. */
type CatalogProduct = Pick<Product, 'id' | 'brand' | 'barcode' | 'description' | 'imageUrls'>;

const partyOf = (name: string, s: SupplierInfo = {}): PrintParty => ({
  name,
  contact: s.contactPerson,
  address: [s.address, [s.city, s.country].filter(Boolean).join(', ')].filter(Boolean).join('\n'),
  phone: s.phone,
  email: s.email,
  trn: s.taxId,
});

const day = (v?: string) => (v ? displayDate(v.slice(0, 10)) : undefined);

type Line = { productId?: number; productName: string; productSku?: string; unitOfMeasure?: string; unitPrice: number; discountPercent: number; taxPercent: number; totalAmount: number; notes?: string };

function toPrintLine(i: Line, qty: number, products: CatalogProduct[], receivedQty?: number) {
  const a = lineAmounts({ quantity: qty, unitPrice: i.unitPrice, discountPercent: i.discountPercent, taxPercent: i.taxPercent });
  const p = i.productId != null ? products.find(x => x.id === i.productId) : undefined;
  return {
    name: i.productName,
    code: i.productSku,
    sku: i.productSku,
    brand: p?.brand,
    barcode: p?.barcode,
    image: p?.imageUrls?.[0],
    // Product description first (short = its first line), then the line's own notes.
    description: [p?.description, i.notes].filter(Boolean).join('\n'),
    uom: i.unitOfMeasure,
    qty,
    receivedQty,
    price: i.unitPrice,
    discountPercent: i.discountPercent,
    discountAmount: a.discount,
    taxable: a.taxable,
    taxPercent: i.taxPercent,
    taxAmount: a.tax,
    total: i.totalAmount || a.total,
  };
}

export function buildOrderDocument(
  po: PurchaseOrder, supplier: SupplierInfo | undefined, company: CompanyDetails, currencyCode: CurrencyCode, products: CatalogProduct[] = [],
): PrintDocument {
  return {
    docType: 'purchase-order',
    number: po.poNumber || 'Draft',
    date: day(po.orderDate) ?? '—',
    company,
    currencyCode,
    supplier: partyOf(po.supplierName, supplier),
    shipTo: po.deliveryAddress,
    meta: [
      { setting: 'showDocNumber', label: 'PO Number', value: po.poNumber || 'Draft' },
      { setting: 'showDocDate', label: 'Order Date', value: day(po.orderDate) },
      { setting: 'showDueDate', label: 'Deliver By', value: day(po.expectedDeliveryDate) },
      { setting: 'showPaymentTerms', label: 'Payment Terms', value: po.paymentTerms },
      { setting: 'showPriority', label: 'Priority', value: priorityMeta(po.priority).label },
      { setting: 'showPreparedBy', label: 'Prepared By', value: po.createdBy },
      { setting: 'showApprovedBy', label: 'Approved By', value: po.approvedBy },
    ],
    lines: po.items.map(i => toPrintLine(i, i.quantityOrdered, products, i.quantityReceived)),
    totals: {
      subtotal: po.subtotal,
      discount: po.discountAmount,
      taxable: po.subtotal - po.discountAmount,
      tax: po.taxAmount,
      shipping: po.shippingCost,
      grandTotal: po.totalAmount,
    },
    notes: po.notes,
  };
}

export function buildBillDocument(
  bill: SupplierBill, supplier: SupplierInfo | undefined, company: CompanyDetails, currencyCode: CurrencyCode,
  extras: { warehouse?: string; poNumber?: string } = {}, products: CatalogProduct[] = [],
): PrintDocument {
  return {
    docType: 'purchase-invoice',
    number: bill.billNumber || 'Draft',
    date: day(bill.billDate) ?? '—',
    company,
    currencyCode,
    supplier: partyOf(bill.supplierName, supplier),
    meta: [
      { setting: 'showDocNumber', label: 'Invoice No.', value: bill.billNumber || 'Draft' },
      { setting: 'showDocDate', label: 'Invoice Date', value: day(bill.billDate) },
      { setting: 'showDueDate', label: 'Due Date', value: day(bill.dueDate) },
      { setting: 'showPaymentTerms', label: 'Payment Terms', value: supplier?.paymentTerms },
      { setting: 'showSupplierInvoiceNo', label: 'Supplier Inv. No.', value: bill.invoiceNumber },
      { setting: 'showPOReference', label: 'P.O. Number', value: extras.poNumber },
      { setting: 'showWarehouse', label: 'Warehouse / Store', value: extras.warehouse },
      { setting: 'showReceivedBy', label: 'Received By', value: bill.receivedBy },
      { setting: 'showPriority', label: 'Priority', value: priorityMeta(bill.priority).label },
      { setting: 'showPreparedBy', label: 'Prepared By', value: bill.createdBy },
    ],
    lines: bill.items.map(i => toPrintLine(i, i.quantity, products)),
    totals: {
      subtotal: bill.subtotal,
      discount: bill.discountAmount,
      taxable: bill.subtotal - bill.discountAmount,
      tax: bill.taxAmount,
      shipping: bill.shippingCost,
      grandTotal: bill.totalAmount,
      paid: bill.amountPaid,
      balance: balanceOf(bill),
    },
    notes: bill.notes,
  };
}

// ── Branch currency ──────────────────────────────────────────────────────────

const currencyCache = new Map<number, CurrencyCode>();

/** Display currency saved for `branchId` (Settings › Currency is branch-scoped). */
async function branchCurrency(branchId: number | undefined, fallback: CurrencyCode): Promise<CurrencyCode> {
  if (branchId == null) return fallback;
  const hit = currencyCache.get(branchId);
  if (hit) return hit;
  try {
    const settings = await financialSettingsService.getSettings('APP_PREFERENCES', branchId);
    const saved = settings.find(s => s.settingKey === 'currency_code')?.settingValue;
    const code = CURRENCIES.some(c => c.code === saved) ? (saved as CurrencyCode) : 'AED';
    currencyCache.set(branchId, code);
    return code;
  } catch {
    return fallback;
  }
}

// ── Template ─────────────────────────────────────────────────────────────────

export async function loadDefaultSettings(docType: DocType): Promise<DocTemplateSettings> {
  try {
    const list = await printTemplateService.getTemplates(docTypeMeta(docType).category);
    const chosen = list.find(t => t.isDefault) ?? list[0];
    return resolveSettings(docType, chosen ? { ...chosen.settings, paperSize: chosen.paperSize } : null);
  } catch (err) {
    // Printing must never be blocked by the template API — fall back to the built-in layout.
    console.error('Failed to load print template, using the built-in layout', err);
    return resolveSettings(docType, null);
  }
}

// ── Printing ─────────────────────────────────────────────────────────────────

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// White space around the page content. @page margin is 0 so the browser has no
// room to print its own header/footer (date, title, URL); these margins are
// recreated inside the page by a table whose thead/tfoot spacers repeat on
// every printed page.
const MARGIN_MM = { top: 12, side: 12, bottom: 14 };
const MM_TO_PX = 96 / 25.4;

export function printDocumentHtml(s: DocTemplateSettings, doc: PrintDocument): string {
  const paper = PAPER_MM[s.paperSize] ?? PAPER_MM.A4;
  const m = MARGIN_MM;
  const body = renderToStaticMarkup(<DocumentView s={s} doc={doc} forPrint />);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(`${docTypeMeta(doc.docType).label} ${doc.number}`)}</title>
<style>
  @page{size:${paper.w}mm ${paper.h}mm;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;background:#fff}
  p{margin:0}
  .frame{width:100%;border-collapse:collapse}
  .frame>thead>tr>td,.frame>tfoot>tr>td,.frame>tbody>tr>td{padding:0 ${m.side}mm}
  .space-top{height:${m.top}mm}
  .space-bottom{height:${m.bottom}mm}
  .sheet{min-height:calc(${paper.h - m.top - m.bottom}mm - 2px);display:flex;flex-direction:column}
  .sheet>div{flex:1}
</style></head><body>
<table class="frame">
  <thead><tr><td><div class="space-top"></div></td></tr></thead>
  <tfoot><tr><td><div class="space-bottom"></div></td></tr></tfoot>
  <tbody><tr><td><div class="sheet">${body}</div></td></tr></tbody>
</table>
</body></html>`;
}

async function waitForImages(doc: Document) {
  await Promise.all(Array.from(doc.images).map(img =>
    img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = img.onerror = () => res(); })));
}

/**
 * Prints `html` from a hidden in-page frame, so only the browser's print dialog
 * appears — no extra tab. The frame is removed once printing is done.
 */
export async function printHtml(html: string, paperSize: DocTemplateSettings['paperSize']) {
  const paper = PAPER_MM[paperSize] ?? PAPER_MM.A4;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  // Laid out at the paper's width (off-screen) so the page-count check below measures real print layout.
  Object.assign(frame.style, {
    position: 'fixed', left: '-10000px', top: '0', width: `${paper.w}mm`, height: `${paper.h}mm`, border: '0', opacity: '0', pointerEvents: 'none',
  });
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();
  await waitForImages(doc);

  // Column headers never wrap, so a big font with every column on can be wider than the
  // paper — scale the document down to fit rather than cutting off the right-hand columns.
  const sheet = doc.querySelector<HTMLElement>('.sheet');
  const usable = (paper.h - MARGIN_MM.top - MARGIN_MM.bottom) * MM_TO_PX;
  // The overflowing table widens .sheet itself, so compare against the paper's printable width.
  const printable = (paper.w - 2 * MARGIN_MM.side) * MM_TO_PX;
  const width = sheet?.getBoundingClientRect().width ?? 0;
  let scale = 1;
  if (sheet && width > printable + 1) {
    scale = printable / width;
    const style = sheet.style as CSSStyleDeclaration & { zoom: string };
    style.zoom = String(scale);
    // zoom shrinks min-height too; scale it back up so the footer still sits at the page bottom.
    style.minHeight = `${(usable - 2) / scale}px`;
  }

  // "Page 1 of 1" is only true for a one-page document; the browser can't number
  // pages without its own (hidden) footer, so drop the line when content spills over.
  if (sheet && sheet.getBoundingClientRect().height > usable + 2) doc.querySelectorAll('[data-page-number]').forEach(el => el.remove());

  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  // Browsers that don't fire afterprint on iframes: remove after the (blocking) dialog closes.
  setTimeout(() => { if (frame.isConnected) frame.remove(); }, 60_000);
}

/**
 * Loads the default template and the document's branch details, then opens the
 * print dialog. Failures are reported through onError.
 */
export function printPurchaseDocument(opts: {
  docType: DocType;
  branchId?: number;
  fallbackCurrency: CurrencyCode;
  build: (company: CompanyDetails, currencyCode: CurrencyCode) => PrintDocument;
  onError?: (message: string) => void;
}): void {
  (async () => {
    const [settings, company, currencyCode] = await Promise.all([
      loadDefaultSettings(opts.docType),
      getCompanyDetails(opts.branchId),
      branchCurrency(opts.branchId, opts.fallbackCurrency),
    ]);
    await printHtml(printDocumentHtml(settings, opts.build(company, currencyCode)), settings.paperSize);
  })().catch(err => {
    console.error('Failed to print document', err);
    opts.onError?.(err?.message || 'Failed to prepare the document for printing');
  });
}