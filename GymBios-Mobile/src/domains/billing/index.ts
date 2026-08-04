// ── Domain Models ───────────────────────────────────────────────────────────

export type {
  Receipt,
  PaymentSplit,
  MinorCharge,
} from './domain/Receipt';
export {
  TransactionType,
  ReceiptStatus,
  PaymentMethod,
  MembershipType,
} from './domain/Receipt';

export type { Bill } from './domain/Bill';

export type {
  Statement,
  StatementLine,
} from './domain/Statement';
export { StatementLineType } from './domain/Statement';

export type {
  BillingStats,
  MonthlyCollectionData,
} from './domain/BillingStats';

export type { MemberDue } from './domain/MemberDue';
export { DueStatus } from './domain/MemberDue';

export type {
  CollectionReport,
  CollectionReportRow,
  CollectionReportSummary,
} from './domain/CollectionReport';

// ── Application Layer ───────────────────────────────────────────────────────

export type {
  BillingRepository,
  ReceiptFilters,
  Pagination,
  ReceiptsPage,
  BillPayment,
  SettlePaymentRequest,
  StatementRange,
} from './application/BillingRepository';

export { BillingService } from './application/BillingService';

// ── Infrastructure Layer ────────────────────────────────────────────────────

export { ApiBillingRepository } from './infrastructure/ApiBillingRepository';

// ── TanStack Query Keys ─────────────────────────────────────────────────────

export { billingKeys } from './hooks/billingKeys';

// ── Query Hooks ─────────────────────────────────────────────────────────────

export {
  useBillingStats,
  useReceipts,
  useReceipt,
  useMemberDues,
  useMemberStatement,
  usePendingBills,
} from './hooks/useBills';

// ── Mutation Hooks ──────────────────────────────────────────────────────────

export { useSettlePayment } from './hooks/useBillActions';