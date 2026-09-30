import React from 'react';
import { buildQrCodeSvg, type CompanyDetails } from '../../utils/company-details';
import { CURRENCIES, type CurrencyCode } from '../../utils/currency';
import aedSymbolUrl from '../../assets/currency/aed-symbol.webp';

// Sales / purchase document layout ported from BillBull's Print & Email Templates
// ("Classic" DocumentTemplateDesigner). One component renders both the live
// designer preview and the real print (via renderToStaticMarkup), so what the
// user designs is exactly what prints. Everything here is inline-styled: the
// print window has no app CSS.

// ── Document types ───────────────────────────────────────────────────────────

export type DocType = 'sales-invoice' | 'purchase-order' | 'purchase-invoice';

export const DOC_TYPES: { id: DocType; category: 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_INVOICE'; label: string; code: string; description: string }[] = [
  { id: 'sales-invoice', category: 'SALES_INVOICE', label: 'Sales Invoice', code: 'SI', description: 'Tax invoice issued to members and walk-in customers' },
  { id: 'purchase-order', category: 'PURCHASE_ORDER', label: 'Purchase Order', code: 'PO', description: 'Order issued to suppliers for goods and services' },
  { id: 'purchase-invoice', category: 'PURCHASE_INVOICE', label: 'Purchase Invoice', code: 'PI', description: 'Supplier invoice received for purchase accounting' },
];

/** Invoices (sales or purchase) carry VAT columns, paid / balance and amount in words. */
export const isInvoiceType = (t: DocType) => t === 'sales-invoice' || t === 'purchase-invoice';

export const docTypeMeta = (t: DocType) => DOC_TYPES.find(d => d.id === t)!;
export const docTypeByCategory = (c: string) => DOC_TYPES.find(d => d.category === c);

// ── Settings ─────────────────────────────────────────────────────────────────

export type PaperSize = 'A4' | 'A5' | 'Letter';

export const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
};

export interface DocTemplateSettings {
  docType: DocType;
  templateName: string;
  // Style
  paperSize: PaperSize;
  accentColor: string;
  grandTotalColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  totalRowBg: string;
  borderColor: string;
  fontFamily: string;
  fontSize: number;
  showGrandTotalBanner: boolean;
  showWatermark: boolean;
  watermarkText: string;
  showPageNumbers: boolean;
  // Company (values come from Settings › Company Details of the document's branch)
  showLogo: boolean;
  showCompanyName: boolean;
  showCompanyAddress: boolean;
  showCompanyPhone: boolean;
  showCompanyEmail: boolean;
  showTRN: boolean;
  // Supplier
  showBillTo: boolean;
  showShipTo: boolean;
  showSupplierContact: boolean;
  showSupplierAddress: boolean;
  showSupplierPhone: boolean;
  showSupplierEmail: boolean;
  showSupplierTRN: boolean;
  // Doc info
  showDocNumber: boolean;
  showDocDate: boolean;
  showDueDate: boolean;
  showPaymentTerms: boolean;
  showPriority: boolean;
  showPreparedBy: boolean;
  showApprovedBy: boolean;
  showSupplierInvoiceNo: boolean;
  /** PO number on purchase documents; the customer's reference on a sales invoice. */
  showPOReference: boolean;
  showWarehouse: boolean;
  showReceivedBy: boolean;
  showSalesperson: boolean;
  showCurrency: boolean;
  currencyDisplay: 'symbol' | 'code';
  // Table
  showRowLines: boolean;
  colNo: boolean;
  colProductImage: boolean;
  colItemCode: boolean;
  colBrand: boolean;
  colSKU: boolean;
  colBarcode: boolean;
  colDescription: boolean;
  showShortDescription: boolean;
  showDetailedDescription: boolean;
  colUOM: boolean;
  colQty: boolean;
  colReceivedQty: boolean;
  colUnitPrice: boolean;
  colTaxableAmount: boolean;
  colDiscount: boolean;
  colVAT: boolean;
  colVATAmount: boolean;
  colLineTotal: boolean;
  // Totals
  showSubtotal: boolean;
  showDiscountTotal: boolean;
  showTaxableTotal: boolean;
  showVATTotal: boolean;
  /** Shipping on purchase documents; delivery charge on a sales invoice. */
  showShipping: boolean;
  showRoundOff: boolean;
  showGrandTotal: boolean;
  showPaidBalance: boolean;
  showAmountInWords: boolean;
  // Footer
  showBankDetails: boolean;
  bankName: string;
  bankAccount: string;
  bankIBAN: string;
  bankSWIFT: string;
  showTerms: boolean;
  termsText: string;
  termsBgColor: string;
  showNotes: boolean;
  notesLabel: string;
  notesBgColor: string;
  showCompanyStamp: boolean;
  stampUrl: string;
  showQRCode: boolean;
  showSignatures: boolean;
}

/**
 * Defaults are BillBull's DocumentTemplateDesigner defaults for its Sales
 * Invoice, LPO (Purchase Order) and Purchase Invoice types, value for value.
 * Toggles with no BillBull equivalent (priority, approved by, received by,
 * shipping, round-off, signatures) are GymBios additions.
 */
export function defaultSettings(docType: DocType): DocTemplateSettings {
  const isPO = docType === 'purchase-order';
  const isSI = docType === 'sales-invoice';
  // BillBull's `isInv`: the sales and purchase invoice share every invoice default.
  const isPI = isInvoiceType(docType);
  return {
    docType,
    templateName: `Default ${docTypeMeta(docType).label}`,
    paperSize: 'A4',
    accentColor: '#F5C742',
    grandTotalColor: '#1a1a2e',
    tableHeaderBg: '#f8fafc',
    tableHeaderText: '#1a1a2e',
    totalRowBg: '#f8fafc',
    borderColor: '#e2e8f0',
    fontFamily: 'Inter, sans-serif',
    fontSize: 9,
    showGrandTotalBanner: true,
    showWatermark: false,
    watermarkText: 'ORIGINAL',
    showPageNumbers: true,
    showLogo: true,
    showCompanyName: true,
    showCompanyAddress: true,
    showCompanyPhone: true,
    showCompanyEmail: true,
    showTRN: true,
    showBillTo: true,
    showShipTo: false,
    showSupplierContact: true,
    showSupplierAddress: true,
    showSupplierPhone: true,
    showSupplierEmail: true,
    showSupplierTRN: isPI,
    showDocNumber: true,
    showDocDate: true,
    showDueDate: isPI,
    showPaymentTerms: isPI,
    showPriority: false,
    showPreparedBy: true,
    showApprovedBy: false,
    showSupplierInvoiceNo: isPI && !isSI,
    showPOReference: isPI,
    showWarehouse: false,
    showReceivedBy: false,
    showSalesperson: isSI,
    showCurrency: true,
    currencyDisplay: 'symbol',
    showRowLines: true,
    colNo: true,
    colProductImage: true,
    colItemCode: true,
    colBrand: false,
    colSKU: false,
    colBarcode: false,
    colDescription: true,
    showShortDescription: true,
    showDetailedDescription: true,
    colUOM: true,
    colQty: true,
    colReceivedQty: false,
    colUnitPrice: true,
    colTaxableAmount: isPI,
    colDiscount: true,
    colVAT: isPI,
    colVATAmount: isPI,
    colLineTotal: true,
    showSubtotal: true,
    showDiscountTotal: true,
    showTaxableTotal: isPI,
    showVATTotal: isPI,
    showShipping: true,
    showRoundOff: true,
    showGrandTotal: true,
    showPaidBalance: isPI,
    showAmountInWords: isPI,
    // BillBull ships demo bank data here; GymBios starts blank (the block is skipped until filled in).
    showBankDetails: isPI,
    bankName: '',
    bankAccount: '',
    bankIBAN: '',
    bankSWIFT: '',
    showTerms: true,
    termsText: isPO
      ? '1. This purchase order is binding upon confirmation by vendor.\n2. Goods must match specifications and be delivered by the stated date.\n3. Any substitutions require prior written approval.'
      : '1. Payment is due within the terms stated above.\n2. Late payments attract 2% monthly interest.\n3. Goods remain property of seller until full payment received.',
    termsBgColor: '#fffbeb',
    showNotes: true,
    notesLabel: 'Notes',
    notesBgColor: '',
    showCompanyStamp: true,
    stampUrl: '',
    showQRCode: isPI,
    showSignatures: false,
  };
}

/** Saved settings over the defaults, so templates saved before a field existed still render. */
export function resolveSettings(docType: DocType, saved?: Record<string, unknown> | null): DocTemplateSettings {
  return { ...defaultSettings(docType), ...(saved ?? {}), docType } as DocTemplateSettings;
}

// ── Document data ────────────────────────────────────────────────────────────

/** Header fields, each tied to the settings toggle that shows it. */
export type MetaField = { setting: keyof DocTemplateSettings; label: string; value?: string };

export interface PrintParty {
  name: string;
  contact?: string;
  address?: string;
  phone?: string;
  email?: string;
  trn?: string;
}

export interface PrintLine {
  name: string;
  code?: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  image?: string;
  /** First line prints as the short description, the rest as the detailed description. */
  description?: string;
  uom?: string;
  qty: number;
  receivedQty?: number;
  price: number;
  discountPercent: number;
  discountAmount: number;
  taxable: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

export interface PrintDocument {
  docType: DocType;
  /** Printed heading; defaults to the document type's label (e.g. "Tax Invoice" for a taxed sale). */
  title?: string;
  number: string;
  date: string;
  company: CompanyDetails;
  currencyCode: CurrencyCode;
  /** The other party — the supplier on purchase documents, the customer (Bill To) on a sales invoice. */
  supplier: PrintParty;
  shipTo?: string;
  meta: MetaField[];
  lines: PrintLine[];
  totals: {
    subtotal: number; discount: number; taxable: number; tax: number; shipping: number; grandTotal: number;
    roundOff?: number; paid?: number; balance?: number;
  };
  notes?: string;
}

/** Heading over the party block, and the label of the shipping row, per document type. */
export const partyLabel = (t: DocType) => (t === 'sales-invoice' ? 'Bill To' : 'Supplier');
export const shippingLabel = (t: DocType) => (t === 'sales-invoice' ? 'Delivery Charge' : 'Shipping');

// ── Formatting ───────────────────────────────────────────────────────────────

const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ''}`;
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ');
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const parts: string[] = [];
  for (let i = 0; n > 0 && i < scales.length; i++) {
    const chunk = n % 1000;
    if (chunk) parts.unshift([below1000(chunk), scales[i]].filter(Boolean).join(' '));
    n = Math.floor(n / 1000);
  }
  return parts.join(' ');
}

const CURRENCY_UNITS: Record<string, { main: string; sub: string }> = {
  AED: { main: 'Dirhams', sub: 'Fils' },
  SAR: { main: 'Riyals', sub: 'Halalas' },
  USD: { main: 'Dollars', sub: 'Cents' },
  EUR: { main: 'Euros', sub: 'Cents' },
  GBP: { main: 'Pounds', sub: 'Pence' },
  INR: { main: 'Rupees', sub: 'Paise' },
};

export function amountInWords(amount: number, currencyCode: string): string {
  const units = CURRENCY_UNITS[currencyCode] ?? { main: currencyCode, sub: 'Cents' };
  const cents = Math.round(Math.abs(amount) * 100);
  const main = Math.floor(cents / 100);
  const sub = cents % 100;
  return `${units.main} ${numberToWords(main)}${sub ? ` and ${numberToWords(sub)} ${units.sub}` : ''} Only`;
}

// The AED mark is a CSS mask (inherits text colour). The URL must be absolute:
// the print window is about:blank and can't resolve the app's relative asset path.
const absoluteAedUrl = () => new URL(aedSymbolUrl, window.location.href).href;

function CurrencyMark({ code, display }: { code: CurrencyCode; display: 'symbol' | 'code' }) {
  if (display === 'code') return <span>{code}</span>;
  const def = CURRENCIES.find(c => c.code === code);
  if (def?.hasImageGlyph) {
    const url = `url("${absoluteAedUrl()}")`;
    return (
      <span
        role="img"
        aria-label={code}
        style={{
          display: 'inline-block', verticalAlign: '-0.08em', margin: '0 0.06em', width: '1.05em', height: '0.82em',
          backgroundColor: 'currentColor', WebkitMaskImage: url, maskImage: url, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain',
        }}
      />
    );
  }
  return <span>{def?.textPrefix.trim() ?? code}</span>;
}

// ── Classic layout (BillBull) ────────────────────────────────────────────────

export function DocumentView({ s, doc, forPrint = false }: { s: DocTemplateSettings; doc: PrintDocument; forPrint?: boolean }) {
  const f = s.fontSize;
  const cur = <CurrencyMark code={doc.currencyCode} display={s.currencyDisplay} />;
  const co = doc.company;
  const t = doc.totals;
  const isPI = isInvoiceType(doc.docType);
  const title = doc.title ?? docTypeMeta(doc.docType).label;
  const rowLine = s.showRowLines ? `1px solid ${s.borderColor}` : 'none';

  const th: React.CSSProperties = {
    // Single-line headers; the 5px side padding (BillBull uses 8px) keeps every column inside the page
    // when all of them are on — the description column absorbs whatever width is left.
    background: s.tableHeaderBg, color: s.tableHeaderText, padding: '6px 5px', fontWeight: 700,
    fontSize: `${f - 0.5}px`, textAlign: 'center', whiteSpace: 'nowrap',
  };
  const td = (align: 'left' | 'right' | 'center' = 'left', bold = false): React.CSSProperties => ({
    padding: '5px 5px', fontSize: `${f}px`, textAlign: align, borderBottom: rowLine, fontWeight: bold ? 600 : 400, verticalAlign: 'top',
    whiteSpace: align === 'left' ? undefined : 'nowrap', // numbers stay on one line; names/descriptions wrap
  });
  const upperLabel: React.CSSProperties = {
    fontWeight: 700, fontSize: `${f - 0.5}px`, margin: '0 0 4px', color: '#888', letterSpacing: 0.5, textTransform: 'uppercase',
  };

  const meta = [
    ...doc.meta,
    { setting: 'showCurrency' as const, label: 'Currency', value: doc.currencyCode },
  ].filter(m => s[m.setting] && m.value);

  const sup = doc.supplier;
  const supplierLines = [
    // A sales invoice's "contact" is the member ID line, printed as-is.
    s.showSupplierContact && sup.contact && (doc.docType === 'sales-invoice' ? sup.contact : `Attn: ${sup.contact}`),
    s.showSupplierAddress && sup.address,
  ].filter(Boolean) as string[];

  const summaryLabel = isPI && (t.balance ?? 0) > 0 && s.showPaidBalance ? 'Balance Due' : 'Grand Total';
  const summaryAmount = summaryLabel === 'Balance Due' ? t.balance ?? 0 : t.grandTotal;

  const totalRow = (label: string, value: string, opts: { red?: boolean; strong?: boolean } = {}) => {
    const color = opts.red ? '#e11d48' : undefined;
    const pad = opts.strong ? '6px' : '3px';
    return (
      <tr key={label} style={opts.strong ? { background: s.totalRowBg } : undefined}>
        <td style={{ padding: `${pad} 16px ${pad} 0`, color: color ?? (opts.strong ? undefined : '#888'), textAlign: 'right', fontWeight: opts.strong ? 700 : 400, fontSize: opts.strong ? `${f + 1}px` : undefined }}>{label}</td>
        <td style={{ padding: `${pad} 0`, textAlign: 'right', fontWeight: 600, width: 60, color, fontSize: opts.strong ? `${f + 1}px` : undefined }}>{cur}</td>
        <td style={{ padding: `${pad} 0 ${pad} 12px`, textAlign: 'right', fontWeight: opts.strong ? 800 : 700, width: 110, color, fontSize: opts.strong ? `${f + 2}px` : undefined }}>{value}</td>
      </tr>
    );
  };

  const qrPayload = [
    `${co.name} - ${title}`,
    `No: ${doc.number}`,
    `Date: ${doc.date}`,
    `${doc.docType === 'sales-invoice' ? 'Customer' : 'Supplier'}: ${sup.name}`,
    `Total: ${doc.currencyCode} ${fmt(t.grandTotal)}`,
    co.trn && `TRN: ${co.trn}`,
  ].filter(Boolean).join('\n');

  return (
    <div
      style={{
        fontFamily: s.fontFamily, fontSize: `${f}px`, background: '#fff', color: '#333', position: 'relative',
        // flex: 1 fills the page box (print .sheet / preview paper) so the footer sits at the page bottom.
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1,
        ...(forPrint ? {} : { padding: '28px 32px' }),
      }}
    >
      {/* ── BODY: grows to fill page ── */}
      <div style={{ flex: 1 }}>
        {/* HEADER: Supplier | Doc info | Logo + Company */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: `${f + 17}px`, fontWeight: 700, color: '#1a1a2e', margin: '0 0 14px', letterSpacing: '-0.5px' }}>{title}</h1>
            {s.showBillTo && (
              <div style={{ marginBottom: s.showShipTo && doc.shipTo ? 12 : 0 }}>
                <p style={upperLabel}>{partyLabel(doc.docType)}</p>
                <p style={{ fontWeight: 700, fontSize: `${f + 1}px`, margin: '0 0 2px' }}>{sup.name}</p>
                {/* One line height for every row, matching the company block on the right. */}
                <div style={{ lineHeight: 1.55 }}>
                  {supplierLines.map(l => <p key={l} style={{ whiteSpace: 'pre-line', color: '#444', margin: 0 }}>{l}</p>)}
                  {s.showSupplierPhone && sup.phone && <p style={{ margin: 0, color: '#555' }}>{sup.phone}</p>}
                  {s.showSupplierEmail && sup.email && <p style={{ margin: 0, color: '#555' }}>{sup.email}</p>}
                  {s.showSupplierTRN && sup.trn && <p style={{ margin: 0, color: '#666' }}>TRN: {sup.trn}</p>}
                </div>
              </div>
            )}
            {s.showShipTo && doc.shipTo && (
              <div>
                <p style={upperLabel}>Deliver To</p>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.55, color: '#444', margin: 0 }}>{doc.shipTo}</p>
              </div>
            )}
          </div>

          {meta.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', paddingTop: 64, paddingBottom: 2 }}>
              {meta.map(m => (
                <div key={m.label}>
                  <p style={{ margin: 0, fontSize: `${f - 1}px`, color: '#999', fontWeight: 500 }}>{m.label}</p>
                  <p style={{ margin: '1px 0 0', fontSize: `${f}px`, fontWeight: 700, color: '#1a1a2e' }}>
                    {m.setting === 'showCurrency' ? cur : m.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, maxWidth: '38%' }}>
            {s.showLogo && (co.logo ? (
              <img src={co.logo} alt="logo" style={{ height: 72, maxWidth: 200, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${s.accentColor}22`, border: `3px solid ${s.accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: s.accentColor }}>{(co.name || 'G').charAt(0).toUpperCase()}</span>
              </div>
            ))}
            <div style={{ textAlign: 'right', lineHeight: 1.55 }}>
              {s.showCompanyName && <p style={{ fontWeight: 700, fontSize: `${f + 3}px`, color: '#1a1a2e', margin: 0 }}>{co.name}</p>}
              {s.showCompanyAddress && co.address && <p style={{ margin: 0, color: '#555', whiteSpace: 'pre-line' }}>{co.address}</p>}
              {s.showCompanyPhone && co.phone && <p style={{ margin: 0 }}>{co.phone}</p>}
              {s.showCompanyEmail && co.email && <p style={{ margin: 0 }}>{co.email}</p>}
              {s.showTRN && co.trn && <p style={{ margin: 0, color: '#666' }}>TRN · {co.trn}</p>}
            </div>
          </div>
        </div>

        {/* GRAND TOTAL BANNER */}
        {s.showGrandTotalBanner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0 14px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: `${f}px`, color: '#888', margin: '0 0 2px', fontWeight: 600, letterSpacing: 1 }}>{summaryLabel}</p>
              <p style={{ fontSize: `${f + 22}px`, fontWeight: 800, color: s.grandTotalColor, margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>
                {cur} {fmt(summaryAmount)}
              </p>
            </div>
          </div>
        )}

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: `${f}px` }}>
          <thead style={{ display: 'table-header-group' }}>
            <tr>
              {s.colNo && <th style={{ ...th, width: 22 }}>#</th>}
              {s.colProductImage && <th style={{ ...th, width: 52 }}>Image</th>}
              {s.colItemCode && <th style={th}>Product / Services</th>}
              {s.colDescription && <th style={th}>Description of Product / Services</th>}
              {s.colUOM && <th style={th}>UOM</th>}
              {s.colQty && <th style={th}>Qty</th>}
              {s.colReceivedQty && <th style={th}>Received</th>}
              {s.colUnitPrice && <th style={th}>Unit Price</th>}
              {s.colTaxableAmount && <th style={th}>Taxable Amount</th>}
              {s.colDiscount && <th style={th}>Disc %</th>}
              {s.colVAT && <th style={th}>VAT %</th>}
              {s.colVATAmount && <th style={th}>VAT Amount</th>}
              {s.colLineTotal && <th style={th}>Line Total</th>}
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => {
              const [shortLine, ...detailLines] = (l.description ?? '').split('\n').map(x => x.trim()).filter(Boolean);
              const descLines = [
                s.showShortDescription ? shortLine : undefined,
                ...(s.showDetailedDescription ? detailLines : []),
              ].filter(Boolean) as string[];
              const subInfo = [
                s.colBrand && l.brand && ['Brand', l.brand, false],
                s.colSKU && l.sku && ['SKU', l.sku, false],
                s.colBarcode && l.barcode && ['Barcode', l.barcode, true],
              ].filter(Boolean) as [string, string, boolean][];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', pageBreakInside: 'avoid' }}>
                  {s.colNo && <td style={{ ...td('center'), fontWeight: 600 }}>{i + 1}</td>}
                  {s.colProductImage && (
                    <td style={td()}>
                      {l.image ? (
                        <img src={l.image} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 4, border: `1px solid ${s.borderColor}` }} />
                      ) : (
                        <div style={{ width: 42, height: 42, background: `${s.accentColor}22`, borderRadius: 4, border: `1px solid ${s.accentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 18 }}>📦</span>
                        </div>
                      )}
                    </td>
                  )}
                  {s.colItemCode && (
                    <td style={td()}>
                      <p style={{ fontWeight: 700, margin: '0 0 1px' }}>{l.name}</p>
                      {l.code && <p style={{ margin: 0, color: '#666', fontSize: `${f - 1}px`, fontFamily: 'monospace' }}>{l.code}</p>}
                      {subInfo.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                          {subInfo.map(([label, value, mono]) => (
                            <span key={label} style={{ fontSize: `${f - 1.5}px`, color: '#64748b', fontFamily: mono ? 'monospace' : undefined }}>
                              <span style={{ color: '#94a3b8', fontFamily: s.fontFamily }}>{label}: </span>{value}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                  {s.colDescription && (
                    <td style={td()}>
                      {descLines.map((d, di) => <span key={di} style={{ display: 'block', lineHeight: 1.6, color: '#444' }}>{'· '}{d}</span>)}
                      {l.discountPercent > 0 && (
                        <p style={{ margin: '4px 0 0', color: '#e11d48', fontSize: `${f - 1}px`, fontWeight: 600 }}>Discount @ {l.discountPercent}%</p>
                      )}
                    </td>
                  )}
                  {s.colUOM && <td style={td('center')}>{l.uom || 'PCS'}</td>}
                  {s.colQty && <td style={td('center')}>{l.qty.toFixed(2)}</td>}
                  {s.colReceivedQty && <td style={td('center')}>{(l.receivedQty ?? 0).toFixed(2)}</td>}
                  {s.colUnitPrice && <td style={td('right')}>{fmt(l.price)}</td>}
                  {s.colTaxableAmount && <td style={td('right')}>{fmt(l.taxable)}</td>}
                  {s.colDiscount && (
                    <td style={td('center')}>
                      {l.discountAmount > 0 ? (
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{fmt(l.discountAmount)}</p>
                          <p style={{ margin: 0, color: '#888', fontSize: `${f - 1}px` }}>@ {l.discountPercent}%</p>
                        </div>
                      ) : '—'}
                    </td>
                  )}
                  {s.colVAT && <td style={td('center')}>{l.taxPercent ? `@ vat ${l.taxPercent}%` : '—'}</td>}
                  {s.colVATAmount && <td style={td('right')}>{fmt(l.taxAmount)}</td>}
                  {s.colLineTotal && <td style={td('right', true)}>{fmt(l.total)}</td>}
                </tr>
              );
            })}
            {doc.lines.length === 0 && (
              <tr><td colSpan={12} style={{ ...td('center'), color: '#94a3b8', padding: '14px 8px' }}>No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER GROUP: pushed to bottom ── */}
      <div style={{ marginTop: 'auto', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <table style={{ minWidth: 260, borderCollapse: 'collapse', fontSize: `${f}px` }}>
            <tbody>
              {s.showSubtotal && totalRow('Sub Total', fmt(t.subtotal))}
              {s.showDiscountTotal && t.discount > 0 && totalRow('Discount', `- ${fmt(t.discount)}`, { red: true })}
              {s.showTaxableTotal && totalRow('Taxable Amount', fmt(t.taxable))}
              {s.showVATTotal && totalRow('Total VAT', fmt(t.tax))}
              {s.showShipping && t.shipping > 0 && totalRow(shippingLabel(doc.docType), fmt(t.shipping))}
              {s.showRoundOff && !!t.roundOff && totalRow('Round Off', fmt(t.roundOff))}
              {s.showGrandTotal && totalRow('Total', fmt(t.grandTotal), { strong: true })}
              {isPI && s.showPaidBalance && totalRow('Paid', fmt(t.paid ?? 0))}
              {isPI && s.showPaidBalance && totalRow('Balance Due', fmt(t.balance ?? 0), { strong: true })}
            </tbody>
          </table>
        </div>

        {s.showAmountInWords && (
          <p style={{ fontSize: `${f}px`, color: '#374151', margin: '0 0 14px', textAlign: 'right' }}>
            In Words: {amountInWords(t.grandTotal, doc.currencyCode)}
          </p>
        )}

        {s.showBankDetails && (s.bankName || s.bankAccount || s.bankIBAN || s.bankSWIFT || !forPrint) && (
          <div style={{ marginBottom: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 14px', fontSize: `${f}px` }}>
            <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#075985' }}>Bank Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
              {[['Bank', s.bankName], ['Account', s.bankAccount], ['IBAN', s.bankIBAN], ['SWIFT / BIC', s.bankSWIFT]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.showTerms && s.termsText && (
          <div style={{ marginBottom: 12, background: s.termsBgColor || '#fffbeb', border: `1px solid ${s.termsBgColor || '#fde68a'}`, borderRadius: 6, padding: '10px 14px', fontSize: `${f}px` }}>
            <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#92400e' }}>Terms &amp; Conditions</p>
            <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: '#374151', margin: 0 }}>{s.termsText}</p>
          </div>
        )}

        {s.showNotes && (
          <div style={{ marginBottom: 14, ...(s.notesBgColor ? { background: s.notesBgColor, borderRadius: 6, padding: '10px 14px' } : {}) }}>
            <p style={{ fontWeight: 700, fontSize: `${f}px`, margin: '0 0 3px' }}>{s.notesLabel}</p>
            <p style={{ color: doc.notes ? '#374151' : '#94a3b8', fontSize: `${f - 0.5}px`, margin: 0, whiteSpace: 'pre-line' }}>{doc.notes || '—'}</p>
          </div>
        )}

        {(s.showCompanyStamp || s.showQRCode || s.showSignatures) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 12 }}>
            {s.showCompanyStamp && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {/* The branch's stamp (Settings › Company Details) wins; the template's own image is the fallback. */}
                {co.stamp || s.stampUrl ? (
                  <img src={co.stamp || s.stampUrl} alt="stamp" style={{ width: 90, height: 90, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 90, height: 90, borderRadius: '50%', border: `2px dashed ${s.accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.accentColor}0d` }}>
                    <span style={{ fontSize: `${f - 1}px`, color: s.accentColor, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>Company<br />Stamp</span>
                  </div>
                )}
                <span style={{ fontSize: `${f - 2}px`, color: '#94a3b8' }}>Official Stamp</span>
              </div>
            )}
            {s.showQRCode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 60, height: 60 }} dangerouslySetInnerHTML={{ __html: buildQrCodeSvg(qrPayload).replace('<svg ', '<svg width="60" height="60" ') }} />
                <span style={{ fontSize: `${f - 2}px`, color: '#94a3b8' }}>Scan to verify</span>
              </div>
            )}
            {s.showSignatures && (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 32 }}>
                {['Prepared by', 'Authorised signatory'].map(l => (
                  <div key={l} style={{ width: 150, borderTop: '1px solid #94a3b8', paddingTop: 5, textAlign: 'center', color: '#64748b', fontSize: `${f - 0.5}px` }}>{l}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* printHtml removes this when the printed document runs past one page. */}
        {s.showPageNumbers && <p data-page-number="" style={{ textAlign: 'right', fontSize: `${f - 2}px`, color: '#cbd5e1', margin: '8px 0 0' }}>Page 1 of 1</p>}
      </div>

      {s.showWatermark && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.06, transform: 'rotate(-35deg)', fontSize: 90, fontWeight: 900, color: s.accentColor, letterSpacing: 8 }}>
          {s.watermarkText}
        </div>
      )}
    </div>
  );
}

// ── Sample document for the designer preview ─────────────────────────────────

export function sampleDocument(docType: DocType, company: CompanyDetails, currencyCode: CurrencyCode): PrintDocument {
  const raw = [
    { name: 'Whey Protein Isolate 2kg', code: 'SUP-WPI-2KG', sku: 'WPI-CHOC-2000', brand: 'Optimum Nutrition', barcode: '6291041500213', description: 'Chocolate flavour\n60 servings per tub\n25 g protein per serving', uom: 'PCS', qty: 24, price: 185, disc: 0, vat: 5 },
    { name: 'Commercial Treadmill T-900', code: 'EQP-TRD-900', sku: 'TRD900-BLK', brand: 'Life Fitness', barcode: '6291041500220', description: '3.0 HP AC motor · 22" belt\nIncludes installation\nColour: Black', uom: 'PCS', qty: 2, price: 7325, disc: 10, vat: 5 },
    { name: 'Resistance Band Set', code: 'ACC-RB-SET5', sku: 'RB-SET-5', brand: 'TheraBand', barcode: '6291041500237', description: 'Set of 5 levels', uom: 'SET', qty: 30, price: 45, disc: 5, vat: 5 },
  ];
  const lines: PrintLine[] = raw.map(r => {
    const gross = r.qty * r.price;
    const discountAmount = +(gross * r.disc / 100).toFixed(2);
    const taxable = gross - discountAmount;
    const taxAmount = +(taxable * r.vat / 100).toFixed(2);
    return {
      name: r.name, code: r.code, sku: r.sku, brand: r.brand, barcode: r.barcode, description: r.description, uom: r.uom, qty: r.qty, receivedQty: Math.floor(r.qty / 2),
      price: r.price, discountPercent: r.disc, discountAmount, taxable, taxPercent: r.vat, taxAmount, total: taxable + taxAmount,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = lines.reduce((s, l) => s + l.discountAmount, 0);
  const tax = lines.reduce((s, l) => s + l.taxAmount, 0);
  const shipping = 150;
  const grandTotal = subtotal - discount + tax + shipping;
  const isPO = docType === 'purchase-order';

  if (docType === 'sales-invoice') {
    const roundOff = -0.25;
    const total = grandTotal + roundOff;
    return {
      docType,
      title: 'Tax Invoice',
      number: 'SI-00000128',
      date: '29 Sep 2026',
      company,
      currencyCode,
      supplier: {
        name: 'Sara Al Mansoori',
        contact: 'Member ID: GYM-0042',
        address: 'Villa 12, Street 4, Al Barsha 2\nDubai, United Arab Emirates',
        phone: '+971 50 123 4567',
        email: 'sara.m@example.com',
        trn: '100987654300003',
      },
      meta: [
        { setting: 'showDocNumber', label: 'Invoice No.', value: 'SI-00000128' },
        { setting: 'showDocDate', label: 'Invoice Date', value: '29 Sep 2026' },
        { setting: 'showDueDate', label: 'Due Date', value: '14 Oct 2026' },
        { setting: 'showPaymentTerms', label: 'Payment Terms', value: 'Net 15' },
        { setting: 'showPOReference', label: 'Customer Ref.', value: 'CORP-7781' },
        { setting: 'showSalesperson', label: 'Salesperson', value: 'Priya Nair' },
        { setting: 'showPreparedBy', label: 'Prepared By', value: 'Priya Nair' },
      ],
      lines,
      totals: { subtotal, discount, taxable: subtotal - discount, tax, shipping, roundOff, grandTotal: total, paid: 5000, balance: total - 5000 },
      notes: 'Thank you for your business!',
    };
  }

  const number = isPO ? 'PO-2026-000184' : 'PI-2026-000092';
  return {
    docType,
    number,
    date: '29 Sep 2026',
    company,
    currencyCode,
    supplier: {
      name: 'FitSupply Trading LLC',
      contact: 'Mr. Rashid Khan',
      address: 'Warehouse 14, Al Quoz Industrial Area 3\nDubai, United Arab Emirates',
      phone: '+971 4 321 9876',
      email: 'orders@fitsupply.ae',
      trn: '100234567800003',
    },
    shipTo: company.address || 'Main branch — receiving bay',
    meta: isPO
      ? [
          { setting: 'showDocNumber', label: 'PO Number', value: number },
          { setting: 'showDocDate', label: 'Order Date', value: '29 Sep 2026' },
          { setting: 'showDueDate', label: 'Deliver By', value: '10 Oct 2026' },
          { setting: 'showPaymentTerms', label: 'Payment Terms', value: 'Net 30' },
          { setting: 'showPriority', label: 'Priority', value: 'High' },
          { setting: 'showPreparedBy', label: 'Prepared By', value: 'Priya Nair' },
          { setting: 'showApprovedBy', label: 'Approved By', value: 'Ahmed Saleh' },
        ]
      : [
          { setting: 'showDocNumber', label: 'Invoice No.', value: number },
          { setting: 'showDocDate', label: 'Invoice Date', value: '29 Sep 2026' },
          { setting: 'showDueDate', label: 'Due Date', value: '29 Oct 2026' },
          { setting: 'showPaymentTerms', label: 'Payment Terms', value: 'Net 30' },
          { setting: 'showSupplierInvoiceNo', label: 'Supplier Inv. No.', value: 'FS-INV-55120' },
          { setting: 'showPOReference', label: 'P.O. Number', value: 'PO-2026-000184' },
          { setting: 'showWarehouse', label: 'Warehouse / Store', value: 'Main Store' },
          { setting: 'showReceivedBy', label: 'Received By', value: 'Priya Nair' },
          { setting: 'showPriority', label: 'Priority', value: 'Medium' },
          { setting: 'showPreparedBy', label: 'Prepared By', value: 'Priya Nair' },
        ],
    lines,
    totals: { subtotal, discount, taxable: subtotal - discount, tax, shipping, grandTotal, paid: 5000, balance: grandTotal - 5000 },
    notes: isPO ? 'Please deliver between 9 AM and 1 PM. Call the store manager on arrival.' : 'Received in good condition.',
  };
}
