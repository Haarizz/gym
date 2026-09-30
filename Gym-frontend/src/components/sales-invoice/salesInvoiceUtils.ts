import { salesInvoiceService, type SalesInvoice } from '../../utils/supabase/sales-invoice-service';
import styles from '../purchase/PurchaseInvoice.module.css';
import { methodLabel, round2, todayIso } from '../purchase/purchaseInvoiceUtils';

// ── Loading ──────────────────────────────────────────────────────────────────
// The list endpoint is paginated; pull every page so KPIs, balances and history are complete.

export async function fetchAllInvoices(status?: SalesInvoice['status']): Promise<SalesInvoice[]> {
  const size = 200;
  const first = await salesInvoiceService.getInvoices({ page: 1, size, status });
  const pages = Math.max(1, first.pagination.totalPages || 1);
  if (pages === 1) return first.invoices;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => salesInvoiceService.getInvoices({ page: i + 2, size, status })));
  return [...first.invoices, ...rest.flatMap(r => r.invoices)];
}

// ── Status ───────────────────────────────────────────────────────────────────
// Status + paymentStatus fold into one lifecycle label, as in BillBull's list.

export type DisplayStatus = 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export const STATUS_FILTERS: { value: DisplayStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type StatusFields = Pick<SalesInvoice, 'status' | 'paymentStatus' | 'dueDate' | 'totalAmount' | 'amountPaid'>;

export function balanceOf(inv: Pick<SalesInvoice, 'totalAmount' | 'amountPaid'>) {
  return Math.max(0, round2((inv.totalAmount || 0) - (inv.amountPaid || 0)));
}

export function displayStatus(inv: StatusFields): DisplayStatus {
  if (inv.status === 'CANCELLED') return 'CANCELLED';
  if (inv.status === 'DRAFT') return 'DRAFT';
  if (inv.paymentStatus === 'PAID' || balanceOf(inv) <= 0) return 'PAID';
  if (inv.dueDate && inv.dueDate < todayIso()) return 'OVERDUE';
  if (inv.paymentStatus === 'PARTIAL') return 'PARTIAL';
  return 'UNPAID';
}

const STATUS_META: Record<DisplayStatus, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',          cls: styles.pillGray },
  UNPAID:    { label: 'Unpaid',         cls: styles.pillBlue },
  PARTIAL:   { label: 'Partially Paid', cls: styles.pillAmber },
  PAID:      { label: 'Paid',           cls: styles.pillGreen },
  OVERDUE:   { label: 'Overdue',        cls: styles.pillRed },
  CANCELLED: { label: 'Cancelled',      cls: styles.pillRed },
};

export const statusMeta = (s: DisplayStatus) => STATUS_META[s];

export const customerTypeMeta = (inv: Pick<SalesInvoice, 'customerType'>) =>
  inv.customerType === 'MEMBER'
    ? { label: 'Member', cls: styles.pillPurple }
    : { label: 'Walk-in', cls: styles.pillPrimary };

/** What the user may do to an invoice in its current state (mirrors backend rules). */
export function invoiceActions(inv: SalesInvoice) {
  const isDraft = inv.status === 'DRAFT';
  const isConfirmed = inv.status === 'CONFIRMED';
  return {
    edit: isDraft,
    confirm: isDraft,
    delete: isDraft,
    cancel: isDraft || (isConfirmed && !(inv.amountPaid > 0)), // paid invoices can't be cancelled
    recordPayment: isConfirmed && inv.paymentStatus !== 'PAID' && balanceOf(inv) > 0,
    print: inv.items.length > 0,
  };
}

// ── Money ────────────────────────────────────────────────────────────────────

export type LineInput = {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
};

export type LineAmounts = {
  gross: number; discount: number; net: number; footerShare: number; taxable: number; tax: number; total: number;
};

/**
 * Invoice math — identical to SalesInvoiceService.computeTotals (2dp HALF_UP per step):
 * line net = qty × price − line discount; the footer discount is spread over lines in
 * proportion to net (last line takes the remainder); VAT is added on top (exclusive)
 * or extracted from the price (inclusive). Net = taxable + VAT + delivery + round-off.
 */
export function invoiceTotals(
  lines: LineInput[],
  opts: { pricesIncludeTax: boolean; footerDiscount: number; deliveryCharge: number; roundOff: number },
) {
  const base = lines.map(l => {
    const gross = round2((Number(l.unitPrice) || 0) * (Number(l.quantity) || 0));
    const discount = round2((gross * (Number(l.discountPercent) || 0)) / 100);
    return { gross, discount, net: round2(gross - discount) };
  });
  const netSum = round2(base.reduce((s, b) => s + b.net, 0));
  const footer = Math.min(Math.max(0, round2(opts.footerDiscount)), netSum);
  let lastWithNet = -1;
  base.forEach((b, i) => { if (b.net > 0) lastWithNet = i; });

  let remaining = footer;
  const perLine: LineAmounts[] = base.map((b, i) => {
    let share = 0;
    if (footer > 0 && b.net > 0) {
      share = i === lastWithNet ? round2(remaining) : round2((footer * b.net) / netSum);
      share = Math.max(0, Math.min(share, b.net));
      remaining = round2(remaining - share);
    }
    const after = round2(b.net - share);
    const rate = Number(lines[i].taxPercent) || 0;
    const taxable = opts.pricesIncludeTax ? round2((after * 100) / (100 + rate)) : after;
    const tax = opts.pricesIncludeTax ? round2(after - taxable) : round2((after * rate) / 100);
    return { ...b, footerShare: share, taxable, tax, total: round2(taxable + tax) };
  });

  const sum = (k: keyof LineAmounts) => round2(perLine.reduce((s, l) => s + l[k], 0));
  const taxable = sum('taxable');
  const tax = sum('tax');
  const delivery = round2(Math.max(0, Number(opts.deliveryCharge) || 0));
  const roundOff = round2(Number(opts.roundOff) || 0);
  return {
    perLine,
    gross: sum('gross'),
    discount: sum('discount'),
    footerDiscount: sum('footerShare'),
    taxable,
    tax,
    delivery,
    roundOff,
    qty: lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
    net: round2(taxable + tax + delivery + roundOff),
  };
}

/** BillBull's rounding helper: the adjustment that brings `exact` to the nearest whole unit. */
export const roundOffToWhole = (exact: number) => round2(Math.round(exact) - exact);

// ── Payments & timeline ──────────────────────────────────────────────────────

export type PaymentLine = { method: string; amount: number; reference?: string; detail?: string; date?: string };

const EARLIER_PAYMENTS = 'Earlier payment(s)';

export function paymentLines(inv: SalesInvoice): PaymentLine[] {
  const raw = Array.isArray(inv.paymentBreakdown) ? inv.paymentBreakdown : [];
  const lines: PaymentLine[] = raw
    .map((p: any): PaymentLine => ({
      method: methodLabel(p.method),
      amount: Number(p.amount) || 0,
      reference: p.reference || p.cheque_number || p.chequeNumber || undefined,
      detail: [p.card_type ?? p.cardType, p.bank_name ?? p.bankName, p.online_payment_type ?? p.onlinePaymentType,
        p.bank_account_name ?? p.bankAccountName].filter(Boolean).join(' · ') || undefined,
      date: p.payment_date ?? p.paymentDate ?? undefined,
    }))
    .filter(l => l.amount > 0);
  const legsTotal = lines.reduce((s, l) => s + l.amount, 0);
  if (inv.amountPaid - legsTotal > 0.005) {
    lines.unshift({ method: EARLIER_PAYMENTS, amount: round2(inv.amountPaid - legsTotal) });
  }
  return lines;
}

export function paymentSummaryLabel(inv: SalesInvoice) {
  const methods = [...new Set(paymentLines(inv).map(l => (l.method === EARLIER_PAYMENTS ? methodLabel(inv.paymentMethod) : l.method)))];
  return methods.join(' + ');
}

export type TimelineEvent = { key: string; label: string; date?: string; amount?: number };

export function buildTimeline(inv: SalesInvoice): TimelineEvent[] {
  const ev: TimelineEvent[] = [
    { key: 'created', label: `Created as draft${inv.createdBy ? ` by ${inv.createdBy}` : ''}`, date: inv.createdAt },
  ];
  if (inv.status !== 'DRAFT' && (inv.status === 'CONFIRMED' || inv.stockDeducted || inv.amountPaid > 0)) {
    ev.push({
      key: 'confirmed',
      label: inv.stockDeducted ? 'Confirmed — stock issued & receivable posted' : 'Confirmed — receivable posted (Stock Check off)',
      date: inv.updatedAt,
    });
  }
  if (inv.amountPaid > 0) {
    ev.push({ key: 'paid', label: inv.paymentStatus === 'PAID' ? 'Paid in full' : 'Partial payment received', date: inv.updatedAt, amount: inv.amountPaid });
  }
  if (inv.status === 'CANCELLED') ev.push({ key: 'cancelled', label: 'Cancelled', date: inv.updatedAt });
  return ev;
}

// ── Export ───────────────────────────────────────────────────────────────────

export function exportInvoicesCsv(invoices: SalesInvoice[], currencyCode: string) {
  const head = ['S.No', 'Invoice No', 'Date', 'Due Date', 'Customer', 'Customer Type', 'Phone', 'Reference', 'Salesperson',
    'Pay Mode', 'Status', 'Items', `Net Amount (${currencyCode})`, `Paid (${currencyCode})`, `Balance (${currencyCode})`];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = invoices.map((inv, i) => [
    i + 1, inv.invoiceNumber, inv.invoiceDate, inv.dueDate ?? '', inv.customerName, customerTypeMeta(inv).label,
    inv.customerPhone ?? '', inv.reference ?? '', inv.salesperson ?? '', inv.amountPaid > 0 ? paymentSummaryLabel(inv) : '',
    statusMeta(displayStatus(inv)).label, inv.items.length, inv.totalAmount.toFixed(2), inv.amountPaid.toFixed(2), balanceOf(inv).toFixed(2),
  ]);
  const csv = [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sales_Invoices_${todayIso()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
