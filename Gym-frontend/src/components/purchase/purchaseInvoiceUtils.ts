import { format } from 'date-fns';
import { supplierBillService, type SupplierBill } from '../../utils/supabase/supplier-bill-service';
import { purchaseService, type PurchaseOrder } from '../../utils/supabase/purchase-service';
import styles from './PurchaseInvoice.module.css';

// ── Loading ──────────────────────────────────────────────────────────────────
// The list endpoints are paginated; pull every page so KPIs, balances and history are complete.

export async function fetchAllBills(): Promise<SupplierBill[]> {
  const size = 200;
  const first = await supplierBillService.getBills({ page: 1, size });
  const pages = Math.max(1, first.pagination.totalPages || 1);
  if (pages === 1) return first.bills;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => supplierBillService.getBills({ page: i + 2, size })));
  return [...first.bills, ...rest.flatMap(r => r.bills)];
}

export async function fetchAllOrders(): Promise<PurchaseOrder[]> {
  const size = 200;
  const first = await purchaseService.getOrders({ page: 1, size });
  const pages = Math.max(1, first.pagination.totalPages || 1);
  if (pages === 1) return first.orders;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => purchaseService.getOrders({ page: i + 2, size })));
  return [...first.orders, ...rest.flatMap(r => r.orders)];
}

// ── Status ───────────────────────────────────────────────────────────────────
// A purchase invoice carries two backend fields (status + paymentStatus); the
// UI folds them into one lifecycle label, like BillBull's sales invoices.

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

export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export function balanceOf(bill: Pick<SupplierBill, 'totalAmount' | 'amountPaid'>) {
  return Math.max(0, round2((bill.totalAmount || 0) - (bill.amountPaid || 0)));
}

export function displayStatus(bill: Pick<SupplierBill, 'status' | 'paymentStatus' | 'dueDate' | 'totalAmount' | 'amountPaid'>): DisplayStatus {
  if (bill.status === 'CANCELLED') return 'CANCELLED';
  if (bill.status === 'DRAFT') return 'DRAFT';
  if (bill.paymentStatus === 'PAID' || balanceOf(bill) <= 0) return 'PAID';
  if (bill.dueDate && bill.dueDate < todayIso()) return 'OVERDUE';
  if (bill.paymentStatus === 'PARTIAL') return 'PARTIAL';
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

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  LOW:    { label: 'Low',    cls: styles.pillGray },
  MEDIUM: { label: 'Medium', cls: styles.pillBlue },
  HIGH:   { label: 'High',   cls: styles.pillAmber },
  URGENT: { label: 'Urgent', cls: styles.pillRed },
};

export const priorityMeta = (p?: string) => PRIORITY_META[p || 'MEDIUM'] ?? PRIORITY_META.MEDIUM;

/** What the user may do to a bill in its current state (mirrors backend rules). */
export function billActions(bill: SupplierBill) {
  const isDraft = bill.status === 'DRAFT';
  const isConfirmed = bill.status === 'CONFIRMED';
  return {
    edit: isDraft,
    confirm: isDraft,
    delete: isDraft,
    cancel: isDraft || (isConfirmed && !(bill.amountPaid > 0)), // paid invoices can't be cancelled
    recordPayment: isConfirmed && bill.paymentStatus !== 'PAID' && balanceOf(bill) > 0,
    print: bill.status !== 'CANCELLED' || bill.items.length > 0,
  };
}

// ── Money ────────────────────────────────────────────────────────────────────

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;

export const money = (n: number) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type LineInput = {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
};

/** Line math, identical to SupplierBillService.buildItem (per-line 2dp HALF_UP). */
export function lineAmounts(l: LineInput) {
  const gross = round2((Number(l.unitPrice) || 0) * (Number(l.quantity) || 0));
  const discount = round2((gross * (Number(l.discountPercent) || 0)) / 100);
  const taxable = round2(gross - discount);
  const tax = round2((taxable * (Number(l.taxPercent) || 0)) / 100);
  return { gross, discount, taxable, tax, total: round2(taxable + tax) };
}

export function billTotals(lines: LineInput[], shippingCost: number) {
  let gross = 0, discount = 0, tax = 0, qty = 0;
  for (const l of lines) {
    const a = lineAmounts(l);
    gross += a.gross;
    discount += a.discount;
    tax += a.tax;
    qty += Number(l.quantity) || 0;
  }
  gross = round2(gross);
  discount = round2(discount);
  tax = round2(tax);
  const taxable = round2(gross - discount);
  const shipping = round2(Number(shippingCost) || 0);
  return { gross, discount, taxable, tax, shipping, qty, net: round2(taxable + tax + shipping) };
}

// ── Dates ────────────────────────────────────────────────────────────────────

export function displayDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : format(d, 'dd MMM yyyy');
}

export function displayDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : format(d, 'dd MMM yyyy, hh:mm a');
}

export const PAYMENT_TERMS: { value: string; label: string; days: number }[] = [
  { value: 'IMMEDIATE', label: 'Immediate', days: 0 },
  { value: 'NET 7', label: 'Net 7', days: 7 },
  { value: 'NET 15', label: 'Net 15', days: 15 },
  { value: 'NET 30', label: 'Net 30', days: 30 },
  { value: 'NET 45', label: 'Net 45', days: 45 },
  { value: 'NET 60', label: 'Net 60', days: 60 },
  { value: 'NET 90', label: 'Net 90', days: 90 },
];

/** Normalise free-text supplier terms ("Net 30", "NET30", "30 days") to a PAYMENT_TERMS value. */
export function normaliseTerms(raw?: string): string {
  if (!raw) return '';
  const up = raw.toUpperCase().trim();
  if (up.startsWith('IMMEDIATE') || up === 'COD' || up === 'CASH') return 'IMMEDIATE';
  const days = up.match(/\d+/)?.[0];
  const hit = days && PAYMENT_TERMS.find(t => t.days === Number(days));
  return hit ? hit.value : '';
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

// ── Payments & timeline ──────────────────────────────────────────────────────

export type PaymentLine = { method: string; amount: number; reference?: string; detail?: string; date?: string };

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', cash: 'Cash', CARD: 'Card', credit_card: 'Card', ONLINE: 'Online',
  bank_transfer: 'Bank Transfer', BANK: 'Bank Transfer', CHEQUE: 'Cheque', Mixed: 'Mixed',
};

export const methodLabel = (m?: string) => (m ? METHOD_LABELS[m] ?? m.replace(/_/g, ' ') : '—');

const EARLIER_PAYMENTS = 'Earlier payment(s)';

export function paymentLines(bill: SupplierBill): PaymentLine[] {
  const raw = Array.isArray(bill.paymentBreakdown) ? bill.paymentBreakdown : [];
  const lines = raw
    .map((p: any) => ({
      method: methodLabel(p.method),
      amount: Number(p.amount) || 0,
      reference: p.reference || p.cheque_number || p.chequeNumber || undefined,
      detail: [p.card_type ?? p.cardType, p.bank_name ?? p.bankName, p.online_payment_type ?? p.onlinePaymentType,
        p.bank_account_name ?? p.bankAccountName].filter(Boolean).join(' · ') || undefined,
      // Stamped per payment since bill payments started recording it; older legs have none.
      date: p.payment_date ?? p.paymentDate ?? undefined,
    }))
    .filter(l => l.amount > 0);
  if (lines.length === 0 && bill.amountPaid > 0) {
    return [{ method: methodLabel(bill.paymentMethod), amount: bill.amountPaid }];
  }
  // Single-method payments recorded before legs were always stored left no leg behind —
  // show them as one line so the list still adds up to the bill's amount paid.
  const legsTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  if (bill.amountPaid - legsTotal > 0.005) {
    lines.unshift({ method: EARLIER_PAYMENTS, amount: Math.round((bill.amountPaid - legsTotal) * 100) / 100 });
  }
  return lines;
}

export function paymentSummaryLabel(bill: SupplierBill) {
  const methods = [...new Set(paymentLines(bill).map(l => l.method === EARLIER_PAYMENTS ? methodLabel(bill.paymentMethod) : l.method))];
  return methods.join(' + ');
}

export type TimelineEvent = { key: string; label: string; date?: string; amount?: number };

export function buildTimeline(bill: SupplierBill): TimelineEvent[] {
  const ev: TimelineEvent[] = [
    { key: 'created', label: `Created as draft${bill.createdBy ? ` by ${bill.createdBy}` : ''}`, date: bill.createdAt },
  ];
  if (bill.status === 'CONFIRMED') ev.push({ key: 'confirmed', label: 'Confirmed — stock received & payable posted', date: bill.updatedAt });
  if (bill.status === 'CANCELLED') ev.push({ key: 'cancelled', label: 'Cancelled', date: bill.updatedAt });
  if (bill.amountPaid > 0) {
    ev.push({
      key: 'paid',
      label: bill.paymentStatus === 'PAID' ? 'Paid in full' : 'Partial payment recorded',
      date: bill.updatedAt,
      amount: bill.amountPaid,
    });
  }
  return ev;
}

// ── Export ───────────────────────────────────────────────────────────────────

export function exportBillsCsv(bills: SupplierBill[], currencyCode: string, warehouseName: (id?: number) => string) {
  const head = ['S.No', 'Bill No', 'Date', 'Due Date', 'Supplier', 'Supplier Invoice No', 'Warehouse', 'Priority',
    'Status', 'Items', `Net Amount (${currencyCode})`, `Paid (${currencyCode})`, `Balance (${currencyCode})`];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = bills.map((b, i) => [
    i + 1, b.billNumber, b.billDate, b.dueDate ?? '', b.supplierName, b.invoiceNumber ?? '',
    warehouseName(b.warehouseId), priorityMeta(b.priority).label, statusMeta(displayStatus(b)).label,
    b.items.length, b.totalAmount.toFixed(2), b.amountPaid.toFixed(2), balanceOf(b).toFixed(2),
  ]);
  const csv = [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Purchase_Invoices_${todayIso()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
