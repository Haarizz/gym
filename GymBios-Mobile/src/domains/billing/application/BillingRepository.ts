import type {
  BillingStats,
  Bill,
  MemberDue,
  Receipt,
  Statement,
} from '../domain';
import type { PaymentMethod, PaymentSplit } from '../domain/Receipt';

/**
 * Filters for the paginated receipts list.
 * Mirrors backend GET /api/receipts query parameters.
 */
export interface ReceiptFilters {
  search?: string;
  transactionType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata returned by the backend.
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated receipts response.
 * Mirrors backend ReceiptsPageResponseDTO.
 */
export interface ReceiptsPage {
  receipts: Receipt[];
  pagination: Pagination;
}

/**
 * One bill to settle within a settle-payment request.
 * Mirrors backend SettlePaymentRequestDTO.BillPayment.
 */
export interface BillPayment {
  receiptId: number;
  payAmount: number;
}

/**
 * Request body for settling one or more pending bills.
 * Mirrors backend SettlePaymentRequestDTO.
 */
export interface SettlePaymentRequest {
  memberDbId: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  transactionRef?: string;
  remarks?: string;
  billPayments: BillPayment[];
  paymentBreakdown?: PaymentSplit[];
}

/**
 * Date range for a member statement query.
 */
export interface StatementRange {
  from?: string;
  to?: string;
}

/**
 * Repository contract for the Billing domain.
 * Implementations (e.g. ApiBillingRepository) handle all HTTP concerns.
 */
export interface BillingRepository {
  getBillingStats(): Promise<BillingStats>;

  getMemberReceipts(filters?: ReceiptFilters): Promise<ReceiptsPage>;

  getReceipt(id: number): Promise<Receipt>;

  getMemberDues(): Promise<MemberDue[]>;

  getPendingBills(memberDbId: number): Promise<Bill[]>;

  settlePayment(request: SettlePaymentRequest): Promise<Receipt>;

  getMemberStatement(
    memberDbId: number,
    range?: StatementRange,
  ): Promise<Statement>;
}