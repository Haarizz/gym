import type { PaymentMethod } from './Receipt';

/**
 * A single collection report row — aggregates collections for a period.
 * Designed to support future collection report endpoints.
 */
export interface CollectionReportRow {
  date?: string;
  receiptNo?: string;
  memberName?: string;
  memberId?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  status?: string;
}

/**
 * Summary totals for a collection report.
 */
export interface CollectionReportSummary {
  totalCollected: number;
  totalReceipts: number;
  totalMembers: number;
  byPaymentMethod: Record<string, number>;
}

/**
 * A collection report — aggregates billing collections over a period.
 * Designed to support future collection report endpoints (CSV/PDF/SOA export).
 */
export interface CollectionReport {
  from?: string;
  to?: string;
  rows: CollectionReportRow[];
  summary: CollectionReportSummary;
}