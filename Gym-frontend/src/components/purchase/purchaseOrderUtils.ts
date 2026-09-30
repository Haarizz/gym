import type { PurchaseOrder } from '../../utils/supabase/purchase-service';
import styles from './PurchaseInvoice.module.css';
import { priorityMeta, todayIso } from './purchaseInvoiceUtils';

// ── Status ───────────────────────────────────────────────────────────────────

export type POStatus = PurchaseOrder['status'];

const STATUS_META: Record<POStatus, { label: string; cls: string }> = {
  DRAFT:              { label: 'Draft',              cls: styles.pillGray },
  PENDING_APPROVAL:   { label: 'Pending Approval',   cls: styles.pillAmber },
  APPROVED:           { label: 'Approved',           cls: styles.pillBlue },
  ORDERED:            { label: 'Ordered',            cls: styles.pillPurple },
  PARTIALLY_RECEIVED: { label: 'Partially Received', cls: styles.pillPrimary },
  RECEIVED:           { label: 'Received',           cls: styles.pillGreen },
  CANCELLED:          { label: 'Cancelled',          cls: styles.pillRed },
};

export const poStatusMeta = (s?: string) => STATUS_META[(s?.toUpperCase() as POStatus) || 'DRAFT'] ?? STATUS_META.DRAFT;

export const PO_STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  ...(Object.keys(STATUS_META) as POStatus[]).map(k => ({ value: k, label: STATUS_META[k].label })),
  { value: 'LATE', label: 'Late Delivery' },
];

/** yyyy-MM-dd from the backend's LocalDateTime strings. */
export const isoDay = (v?: string) => (v ? v.slice(0, 10) : '');

const OPEN_FOR_DELIVERY: POStatus[] = ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'];

export function isLate(po: PurchaseOrder) {
  const due = isoDay(po.expectedDeliveryDate);
  return !!due && due < todayIso() && OPEN_FOR_DELIVERY.includes(po.status);
}

/** Actions allowed in the current state — mirrors PurchaseOrderService.validateTransition. */
export function poActions(po: PurchaseOrder) {
  const s = po.status;
  return {
    edit: s === 'DRAFT' || s === 'PENDING_APPROVAL',
    submit: s === 'DRAFT',
    approve: s === 'PENDING_APPROVAL',
    sendBack: s === 'PENDING_APPROVAL',
    markOrdered: s === 'APPROVED',
    receive: s === 'ORDERED' || s === 'PARTIALLY_RECEIVED',
    cancel: s === 'APPROVED' || s === 'ORDERED',
    delete: s === 'DRAFT' || s === 'CANCELLED',
    invoice: s === 'ORDERED' || s === 'PARTIALLY_RECEIVED' || s === 'RECEIVED',
  };
}

export function receipt(po: PurchaseOrder) {
  const ordered = po.items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
  const received = po.items.reduce((s, i) => s + Math.min(i.quantityReceived || 0, i.quantityOrdered || 0), 0);
  return { ordered, received, pct: ordered > 0 ? Math.round((received / ordered) * 100) : 0 };
}

export type POTimelineEvent = { key: string; label: string; date?: string };

export function buildPOTimeline(po: PurchaseOrder): POTimelineEvent[] {
  const ev: POTimelineEvent[] = [{ key: 'created', label: `Created${po.createdBy ? ` by ${po.createdBy}` : ''}`, date: po.createdAt }];
  const reached = (s: POStatus[]) => s.includes(po.status);
  if (reached(['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'])) ev.push({ key: 'submitted', label: 'Submitted for approval' });
  if (reached(['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'])) ev.push({ key: 'approved', label: `Approved${po.approvedBy ? ` by ${po.approvedBy}` : ''}` });
  if (reached(['ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'])) ev.push({ key: 'ordered', label: 'Sent to supplier' });
  if (po.status === 'PARTIALLY_RECEIVED') ev.push({ key: 'partial', label: 'Goods partially received', date: po.actualDeliveryDate });
  if (po.status === 'RECEIVED') ev.push({ key: 'received', label: 'All goods received', date: po.actualDeliveryDate });
  if (po.status === 'CANCELLED') ev.push({ key: 'cancelled', label: 'Cancelled', date: po.updatedAt });
  return ev;
}

// ── Export ───────────────────────────────────────────────────────────────────

export function exportOrdersCsv(orders: PurchaseOrder[], currencyCode: string) {
  const head = ['S.No', 'PO No', 'Order Date', 'Expected Delivery', 'Supplier', 'Priority', 'Status', 'Items',
    'Qty Ordered', 'Qty Received', `Total (${currencyCode})`];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = orders.map((o, i) => {
    const r = receipt(o);
    return [i + 1, o.poNumber, isoDay(o.orderDate), isoDay(o.expectedDeliveryDate), o.supplierName, priorityMeta(o.priority).label,
      poStatusMeta(o.status).label, o.items.length, r.ordered, r.received, o.totalAmount.toFixed(2)];
  });
  const csv = [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Purchase_Orders_${todayIso()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
