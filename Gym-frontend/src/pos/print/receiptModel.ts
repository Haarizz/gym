// One normalized view-model per printable POS document. Every renderer (browser
// thermal HTML, raw ESC/POS bytes, A4 tax invoice) draws from these, so a receipt
// reads the same however it is printed (BillBull's "single view-model" rule).

import type { CompanyDetails } from "../../utils/company-details";
import type { CreditPayment, PaymentLeg, ReportSummary, Sale, SaleReturn, XReport, ZReport, CashMovement } from "../types";
import { fmtDate, fmtDateTime, num, r2 } from "../pricing";
import type { ReceiptTemplate } from "./receiptTemplate";

export interface ReceiptLine {
  name: string;
  sku: string | null;
  qty: number;
  unitPrice: number;
  gross: number;
  discount: number;
  discountPercent: number;
  /** What the line costs the customer: VAT-inclusive amount when prices include VAT, else ex-VAT net. */
  amount: number;
  vatRate: number | null;
  returnedQty: number;
}

export interface ReceiptModel {
  kind: "SALE" | "RETURN";
  title: string;
  number: string;
  reference: string | null;
  dateTime: string;
  isReprint: boolean;
  company: CompanyDetails;
  currency: string;
  template: ReceiptTemplate;
  cashier: string | null;
  terminal: string | null;
  customer: { name: string; code: string | null; phone: string | null } | null;
  lines: ReceiptLine[];
  subtotal: number;
  /** Line + bill discounts (the promotion / coupon is shown on its own line). */
  discount: number;
  /** Promotion / coupon applied at the till. */
  promo: { label: string; amount: number } | null;
  taxable: number;
  vat: number;
  taxInclusive: boolean;
  total: number;
  hasTax: boolean;
  payments: { label: string; amount: number }[];
  tendered: number | null;
  change: number | null;
  creditAmount: number;
  creditOutstanding: number;
  refunded: number;
  notes: string | null;
  qrPayload: string;
  barcode: string;
}

export function legLabel(l: PaymentLeg): string {
  const m = (l.method || "").toLowerCase();
  if (m === "card") return l.cardType ? `Card (${l.cardType})` : "Card";
  if (m.startsWith("online")) return l.bankAccountName ? `Online (${l.bankAccountName})` : "Online";
  if (m === "credit") return "On account (credit)";
  return l.method || "Payment";
}

function qrPayload(company: CompanyDetails, title: string, number: string, date: string, total: number, vat: number, currency: string) {
  return [
    `${company.name} - ${title}`,
    `No: ${number}`,
    `Date: ${date}`,
    `Total: ${currency} ${num(total)}`,
    vat > 0 ? `VAT: ${currency} ${num(vat)}` : null,
    company.trn ? `TRN: ${company.trn}` : null,
  ].filter(Boolean).join("\n");
}

const titleFor = (t: ReceiptTemplate, hasTax: boolean) =>
  t.title === "auto" ? (hasTax ? "TAX INVOICE" : "RECEIPT") : t.title;

export function saleReceipt(sale: Sale, company: CompanyDetails, template: ReceiptTemplate, currency: string,
                            opts: { isReprint?: boolean } = {}): ReceiptModel {
  const hasTax = sale.taxAmount > 0;
  const title = titleFor(template, hasTax);
  const legs = sale.paymentBreakdown && sale.paymentBreakdown.length > 0
    ? sale.paymentBreakdown
    : [{ method: sale.paymentSummary || sale.paymentMethod, amount: sale.totalAmount }];
  const payments = legs.map((l) => ({ label: legLabel(l), amount: Number(l.amount) || 0 }));
  const date = fmtDateTime(sale.createdAt);
  return {
    kind: "SALE",
    title,
    number: sale.transactionNumber,
    reference: null,
    dateTime: date,
    isReprint: Boolean(opts.isReprint),
    company,
    currency,
    template,
    cashier: sale.cashierName,
    terminal: sale.terminalName,
    customer: sale.memberId ? { name: sale.memberName, code: sale.memberCode, phone: sale.memberPhone } : { name: sale.memberName || "Walk-in Customer", code: null, phone: null },
    lines: sale.items.map((i) => ({
      name: i.productName,
      sku: i.productSku,
      qty: i.quantity,
      unitPrice: i.unitPrice,
      gross: r2(i.unitPrice * i.quantity),
      discount: r2(i.discountAmount + i.billDiscountShare),
      discountPercent: i.discountPercent,
      amount: sale.taxInclusive ? i.lineTotal : i.taxableAmount,
      vatRate: i.taxRate,
      returnedQty: i.returnedQuantity,
    })),
    subtotal: sale.subtotal,
    discount: r2(sale.discountAmount - (sale.codeDiscountAmount || 0)),
    promo: (sale.codeDiscountAmount || 0) > 0
      ? { label: sale.promotionName ? `${sale.promotionName}${sale.discountCode ? ` (${sale.discountCode})` : ""}` : `Code ${sale.discountCode ?? ""}`, amount: sale.codeDiscountAmount }
      : null,
    taxable: sale.taxableAmount,
    vat: sale.taxAmount,
    taxInclusive: sale.taxInclusive,
    total: sale.totalAmount,
    hasTax,
    payments,
    tendered: sale.receivedAmount,
    change: sale.changeAmount,
    creditAmount: sale.creditAmount,
    creditOutstanding: sale.creditOutstanding,
    refunded: sale.refundedAmount,
    notes: sale.notes,
    qrPayload: qrPayload(company, title, sale.transactionNumber, date, sale.totalAmount, sale.taxAmount, currency),
    barcode: sale.transactionNumber,
  };
}

export function returnReceipt(ret: SaleReturn, company: CompanyDetails, template: ReceiptTemplate, currency: string): ReceiptModel {
  const hasTax = ret.taxAmount > 0;
  const title = hasTax ? "TAX CREDIT NOTE" : "RETURN RECEIPT";
  const legs = ret.refundBreakdown ?? [];
  const date = fmtDateTime(ret.createdAt);
  const taxable = r2(ret.totalAmount - ret.taxAmount);
  return {
    kind: "RETURN",
    title,
    number: ret.returnNumber,
    reference: ret.transactionNumber,
    dateTime: date,
    isReprint: false,
    company,
    currency,
    template,
    cashier: ret.cashierName,
    terminal: null,
    customer: { name: ret.memberName || "Walk-in Customer", code: null, phone: null },
    lines: ret.items.map((i) => ({
      name: i.productName,
      sku: i.productSku,
      qty: i.quantity,
      unitPrice: i.unitPrice,
      gross: r2(i.unitPrice * i.quantity),
      discount: i.discountAmount,
      discountPercent: 0,
      amount: i.totalAmount,
      vatRate: null,
      returnedQty: 0,
    })),
    subtotal: ret.subtotal,
    discount: ret.discountAmount,
    promo: null,
    taxable,
    vat: ret.taxAmount,
    taxInclusive: true,
    total: ret.totalAmount,
    hasTax,
    payments: legs.map((l) => ({ label: `Refund — ${legLabel(l)}`, amount: Number(l.amount) || 0 })),
    tendered: null,
    change: null,
    creditAmount: 0,
    creditOutstanding: 0,
    refunded: 0,
    notes: [ret.reason, ret.notes].filter(Boolean).join(" — ") || null,
    qrPayload: qrPayload(company, title, ret.returnNumber, date, ret.totalAmount, ret.taxAmount, currency),
    barcode: ret.returnNumber,
  };
}

// ── Reports & slips ─────────────────────────────────────────────────────────

export interface ReportRow {
  label: string;
  value: string;
  bold?: boolean;
  indent?: boolean;
}

export interface ReportSection {
  heading: string;
  rows: ReportRow[];
}

export interface ReportDoc {
  title: string;
  number: string;
  meta: ReportRow[];
  sections: ReportSection[];
  footer: string | null;
  company: CompanyDetails;
  template: ReceiptTemplate;
  barcode: string | null;
}

const m = (cur: string, n: number | null | undefined) => `${cur} ${num(n)}`;

function summarySections(s: ReportSummary, cur: string): ReportSection[] {
  const sections: ReportSection[] = [
    {
      heading: "Sales Summary",
      rows: [
        { label: "Invoices", value: String(s.invoiceCount) },
        { label: "Gross sales", value: m(cur, s.grossSales) },
        { label: "Line discounts", value: `- ${m(cur, s.lineDiscount)}` },
        { label: "Bill discounts", value: `- ${m(cur, s.billDiscount)}` },
        { label: "Net before VAT", value: m(cur, s.taxableAmount) },
        { label: "VAT", value: m(cur, s.totalTax) },
        { label: "Total sales (incl. VAT)", value: m(cur, s.totalSales), bold: true },
        { label: `Returns (${s.returnCount})`, value: `- ${m(cur, s.returnTotal)}` },
        { label: "Net sales", value: m(cur, s.netSales), bold: true },
        { label: "Items sold / returned", value: `${s.itemsSold} / ${s.itemsReturned}` },
        { label: "Average basket", value: m(cur, s.averageBasket) },
      ],
    },
    {
      heading: "Tenders",
      rows: s.tenders.map((t) => ({ label: `${t.method} (${t.count})`, value: m(cur, t.amount) })),
    },
  ];
  if (s.refunds.some((r) => r.count > 0)) {
    sections.push({ heading: "Refunds", rows: s.refunds.filter((r) => r.count > 0).map((r) => ({ label: `${r.method} (${r.count})`, value: `- ${m(cur, r.amount)}` })) });
  }
  if (s.creditSales > 0 || s.creditCollectionCount > 0) {
    sections.push({
      heading: "Customer Credit",
      rows: [
        { label: "Credit sales (on account)", value: m(cur, s.creditSales) },
        { label: `Credit collected (${s.creditCollectionCount})`, value: m(cur, s.creditCollections) },
        ...s.collections.filter((c) => c.count > 0).map((c) => ({ label: c.method, value: m(cur, c.amount), indent: true })),
      ],
    });
  }
  sections.push({
    heading: "Cash Drawer",
    rows: [
      { label: "Opening float", value: m(cur, s.cash.openingCash) },
      { label: "+ Cash sales", value: m(cur, s.cash.cashSales) },
      { label: "+ Credit collected in cash", value: m(cur, s.cash.creditCollectionsCash) },
      { label: "+ Cash in", value: m(cur, s.cash.cashIn) },
      { label: "- Cash out", value: m(cur, s.cash.cashOut) },
      { label: "- Cash refunds", value: m(cur, s.cash.cashRefunds) },
      { label: "Expected cash", value: m(cur, s.cash.expectedCash), bold: true },
    ],
  });
  return sections;
}

export function xReportDoc(x: XReport, company: CompanyDetails, template: ReceiptTemplate, cur: string,
                           closing?: { counted: number; variance: number; denominations?: Record<string, number> }): ReportDoc {
  const s = x.session;
  const sections = summarySections(x.summary, cur);
  const closed = s.status === "CLOSED";
  const counted = closing?.counted ?? (closed ? s.closingCash : null);
  const variance = closing?.variance ?? (closed ? s.cashVariance : null);
  if (counted != null) {
    const denomRows = Object.entries(closing?.denominations ?? {})
      .filter(([, c]) => Number(c) > 0)
      .map(([d, c]) => ({ label: `${d} × ${c}`, value: m(cur, parseFloat(d) * Number(c)), indent: true }));
    sections.push({
      heading: "Cash Count",
      rows: [
        ...denomRows,
        { label: "Counted cash", value: m(cur, counted), bold: true },
        { label: "Variance", value: m(cur, variance), bold: true },
        ...(s.varianceRemarks ? [{ label: "Remarks", value: s.varianceRemarks }] : []),
      ],
    });
  }
  if (s.cardSettlementAmount != null || s.cardBatchNo) {
    sections.push({
      heading: "Card Settlement",
      rows: [
        { label: "Terminal batch total", value: m(cur, s.cardSettlementAmount) },
        { label: "Batch no.", value: s.cardBatchNo || "—" },
        { label: "Verified", value: s.cardSettlementVerified ? "Yes" : "No" },
      ],
    });
  }
  if (x.cashEvents.length > 0) {
    sections.push({ heading: "Cash Movements", rows: x.cashEvents.map((e) => ({ label: `${e.type}${e.category ? ` · ${e.category}` : ""}`, value: m(cur, e.amount) })) });
  }
  if (x.topItems.length > 0) {
    sections.push({ heading: "Top Items", rows: x.topItems.slice(0, 10).map((i) => ({ label: `${i.quantity} × ${i.name}`, value: m(cur, i.amount) })) });
  }
  return {
    title: closed ? "X-REPORT · SESSION CLOSE" : "X-REPORT (MID-SESSION)",
    number: s.sessionNumber,
    meta: [
      { label: "Session", value: s.sessionNumber },
      { label: "Cashier", value: s.staffName || s.openedBy || "—" },
      ...(s.terminalName ? [{ label: "Terminal", value: s.terminalName }] : []),
      { label: "Business date", value: fmtDate(s.businessDate) },
      { label: "Opened", value: fmtDateTime(s.openedAt) },
      ...(s.closedAt ? [{ label: "Closed", value: fmtDateTime(s.closedAt) }] : []),
      { label: "Invoice range", value: x.summary.firstInvoice ? `${x.summary.firstInvoice} → ${x.summary.lastInvoice}` : "—" },
      { label: "Printed", value: fmtDateTime(new Date().toISOString()) },
    ],
    sections,
    footer: `Generated by ${x.generatedBy}`,
    company,
    template,
    barcode: s.sessionNumber,
  };
}

export function zReportDoc(z: ZReport, company: CompanyDetails, template: ReceiptTemplate, cur: string): ReportDoc {
  const sections = summarySections(z.summary, cur);
  sections.push({
    heading: "Sessions",
    rows: z.sessions.map((s) => ({
      label: `${s.sessionNumber} · ${s.staffName || s.openedBy || ""}`,
      value: s.status === "OPEN" ? "OPEN" : `${m(cur, s.closingCash)} (${(s.cashVariance ?? 0) >= 0 ? "+" : ""}${num(s.cashVariance)})`,
    })),
  });
  if (z.cashiers.length > 0) {
    sections.push({ heading: "By Cashier", rows: z.cashiers.map((c) => ({ label: `${c.cashier} (${c.invoiceCount})`, value: m(cur, c.netSales) })) });
  }
  if (z.categories.length > 0) {
    sections.push({ heading: "By Category", rows: z.categories.map((c) => ({ label: `${c.category} (${c.quantity})`, value: m(cur, c.amount) })) });
  }
  if (z.topItems.length > 0) {
    sections.push({ heading: "Top Items", rows: z.topItems.slice(0, 10).map((i) => ({ label: `${i.quantity} × ${i.name}`, value: m(cur, i.amount) })) });
  }
  if (z.dayClose) {
    sections.push({
      heading: "Day Close",
      rows: [
        { label: "Close no.", value: z.dayClose.closeNumber },
        { label: "Expected cash", value: m(cur, z.dayClose.expectedCash) },
        { label: "Counted cash", value: m(cur, z.dayClose.countedCash) },
        { label: "Variance", value: m(cur, z.dayClose.cashVariance), bold: true },
        { label: "Closed by", value: z.dayClose.closedBy || "—" },
        { label: "Closed at", value: fmtDateTime(z.dayClose.closedAt) },
      ],
    });
  }
  return {
    title: z.dayClose ? "Z-REPORT · DAY CLOSED" : "Z-REPORT (PROVISIONAL)",
    number: z.dayClose?.closeNumber ?? z.businessDate,
    meta: [
      { label: "Business date", value: fmtDate(z.businessDate) },
      { label: "Sessions", value: String(z.sessions.length) },
      { label: "Invoice range", value: z.summary.firstInvoice ? `${z.summary.firstInvoice} → ${z.summary.lastInvoice}` : "—" },
      { label: "Printed", value: fmtDateTime(new Date().toISOString()) },
    ],
    sections,
    footer: `Generated by ${z.generatedBy}`,
    company,
    template,
    barcode: null,
  };
}

export function creditPaymentDoc(p: CreditPayment, outstandingAfter: number | null, company: CompanyDetails,
                                 template: ReceiptTemplate, cur: string): ReportDoc {
  return {
    title: "PAYMENT RECEIPT",
    number: p.paymentNumber,
    meta: [
      { label: "Receipt no.", value: p.paymentNumber },
      { label: "Date", value: fmtDateTime(p.createdAt) },
      { label: "Received from", value: p.memberName },
      { label: "Received by", value: p.receivedBy || "—" },
    ],
    sections: [
      {
        heading: "Payment",
        rows: [
          { label: "Method", value: p.paymentMethod + (p.bankAccountName ? ` (${p.bankAccountName})` : "") },
          ...(p.reference ? [{ label: "Reference", value: p.reference }] : []),
          { label: "Amount received", value: m(cur, p.amount), bold: true },
        ],
      },
      { heading: "Applied To", rows: p.allocations.map((a) => ({ label: a.transactionNumber, value: m(cur, a.amount) })) },
      ...(outstandingAfter != null ? [{ heading: "Account", rows: [{ label: "Balance outstanding", value: m(cur, outstandingAfter), bold: true }] }] : []),
    ],
    footer: template.footerText || null,
    company,
    template,
    barcode: p.paymentNumber,
  };
}

export function cashMovementDoc(mv: CashMovement, sessionNumber: string, company: CompanyDetails,
                                template: ReceiptTemplate, cur: string): ReportDoc {
  const isIn = mv.type === "DROP_IN";
  return {
    title: isIn ? "CASH IN SLIP" : "CASH OUT SLIP",
    number: `CM-${mv.id}`,
    meta: [
      { label: "Slip no.", value: `CM-${mv.id}` },
      { label: "Session", value: sessionNumber },
      { label: "Date", value: fmtDateTime(mv.createdAt) },
      { label: "By", value: mv.createdBy || "—" },
      ...(mv.approvedBy ? [{ label: "Approved by", value: mv.approvedBy }] : []),
    ],
    sections: [{
      heading: "Details",
      rows: [
        { label: "Category", value: mv.category || "—" },
        ...(mv.reason ? [{ label: "Reason", value: mv.reason }] : []),
        ...(mv.reference ? [{ label: "Reference", value: mv.reference }] : []),
        { label: "Amount", value: m(cur, mv.amount), bold: true },
      ],
    }],
    footer: "Signature: ____________________",
    company,
    template,
    barcode: null,
  };
}
