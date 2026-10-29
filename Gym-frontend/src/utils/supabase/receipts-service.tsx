import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// One contributing payment towards a receipt — a receipt can accumulate
// several of these over time (e.g. AED 10 received at registration, then
// AED 35 more via a later settlement), each keeping its own method/date.
export interface ReceiptPaymentLeg {
  method: string;
  amount: number;
  reference?: string;
  card_type?: string;
  cheque_number?: string;
  bank_name?: string;
  cheque_date?: string;
  bank_account_code?: string;
  bank_account_name?: string;
  online_payment_type?: string;
  provider_name?: string;
}

// One family member's charge folded into this bill instead of billed to
// them directly (see the family-billing "billed to head" model) — carried
// on a bill so the pending-dues screen can show whose due it actually is.
export interface ReceiptMinorCharge {
  member_id?: string;
  member_db_id?: number;
  name: string;
  amount: number;
  paid?: boolean;
}

export interface Receipt {
  id: string;
  receipt_no: string;
  // Only set on a bill (New/Renewal/Add-on/Daily Entry/minor charge) — null on
  // a settlement/"Payment" receipt, which isn't itself an invoice.
  invoice_no?: string;
  transaction_date: string;
  member_db_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  transaction_type: string;
  amount: number;
  payment_method: string;
  status: string;
  plan_name?: string;
  // "Renewal" | "Upgrade" | "Downgrade" — set on Renewal receipts at renewal time (BG_103)
  renewal_kind?: string | null;
  valid_from?: string;
  valid_till?: string;
  processed_by?: string;
  remarks?: string;
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  bank_account_code?: string;
  bank_account_name?: string;
  payment_breakdown?: ReceiptPaymentLeg[];
  minor_charges?: ReceiptMinorCharge[];
  membership_type?: string;
  // Cumulative amount paid toward this specific bill across its whole lifecycle
  // (this row's own paid_amount plus any later settlements applied against it).
  // Only meaningful on bill rows — null on settlement/"Payment" rows.
  total_paid_to_date?: number;
  // Snapshot of the member's overall outstanding balance immediately after this
  // transaction posted — an immutable "remaining due after this payment" fact.
  balance_after?: number;
  // If this row is itself a settlement, the bill (receipt id) it paid down.
  linked_bill_id?: string;
  approval_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptsResponse {
  receipts: Receipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Whole-result counts and totals for a receipts filter (GET /receipts/summary). */
export interface ReceiptsSummary {
  total: number;
  paid: number;
  partial: number;
  pending: number;
  overdue: number;
  /** Money actually received (rejected mobile purchases excluded) */
  received: number;
  /** Unpaid remainder on Partial receipts */
  partial_due: number;
}

export interface ReceiptFilters {
  search?: string;
  transactionType?: string;
  status?: string;
  /** Transaction date window: from inclusive, to exclusive (any time zone; sent as UTC) */
  from?: Date;
  to?: Date;
}

// The backend stores transaction dates in UTC without an offset.
const toUtcParam = (d: Date) => d.toISOString().slice(0, 19);

function filterParams(filters: ReceiptFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search)          params.append('search',           filters.search);
  if (filters.transactionType) params.append('transaction_type', filters.transactionType);
  if (filters.status)          params.append('status',           filters.status);
  if (filters.from)            params.append('from',             toUtcParam(filters.from));
  if (filters.to)              params.append('to',               toUtcParam(filters.to));
  return params;
}

class ReceiptsService {
  async getReceipts(
    filters: ReceiptFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ReceiptsResponse> {
    const params = filterParams(filters);
    if (pagination.page)              params.append('page',             String(pagination.page));
    if (pagination.limit)             params.append('limit',            String(pagination.limit));

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/receipts?${params.toString()}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch receipts: ${response.status}`));
    return response.json();
  }

  /** How many receipts match, without fetching them. */
  async countReceipts(filters: ReceiptFilters = {}): Promise<number> {
    const res = await this.getReceipts(filters, { page: 1, limit: 1 });
    return Number(res.pagination?.total ?? 0);
  }

  /** Status counts and money totals for every receipt matching the filters (status is ignored). */
  async getSummary(filters: ReceiptFilters = {}): Promise<ReceiptsSummary> {
    const params = filterParams({ ...filters, status: undefined });
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/receipts/summary?${params.toString()}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch receipt summary: ${response.status}`));
    const s = await response.json();
    return {
      total: Number(s.total ?? 0), paid: Number(s.paid ?? 0), partial: Number(s.partial ?? 0),
      pending: Number(s.pending ?? 0), overdue: Number(s.overdue ?? 0),
      received: Number(s.received ?? 0), partial_due: Number(s.partial_due ?? 0),
    };
  }

  /**
   * Every receipt matching the filters, fetched page by page — for exports only;
   * lists should page through getReceipts instead.
   */
  async getAllReceipts(filters: ReceiptFilters = {}): Promise<Receipt[]> {
    const all: Receipt[] = [];
    for (let page = 1; ; page++) {
      const res = await this.getReceipts(filters, { page, limit: 500 });
      all.push(...res.receipts);
      if (res.receipts.length < 500) return all;
    }
  }

  async getReceiptById(id: string): Promise<Receipt> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/receipts/${id}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch receipt: ${response.status}`));
    return response.json();
  }
}

export const receiptsService = new ReceiptsService();
