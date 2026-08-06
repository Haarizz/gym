import { authService } from './auth-service';
import { Receipt } from './receipts-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BillingStats {
  monthly_collection: number;
  monthly_target: number;
  overdue_count: number;
  overdue_amount: number;
  due_soon_count: number;
  collection_rate: number;
  monthly_data: { month: string; collected: number; target: number }[];
  payment_method_breakdown: Record<string, number>;
}

export interface MemberDue {
  id: number;
  member_id: string;
  member_name: string;
  member_email: string;
  member_phone: string;
  membership: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  last_payment: string | null;
  status: 'Overdue' | 'Due Soon' | 'Pending';
  due_type?: 'Membership Due' | 'Renewal Due';
}

export interface PaymentSplitLeg {
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

export interface SettlePaymentRequest {
  member_db_id: number;
  payment_method: string;
  payment_date?: string;
  transaction_ref?: string;
  remarks?: string;
  bill_payments: { receipt_id: number; pay_amount: number }[];
  payment_breakdown?: PaymentSplitLeg[];
}

// One line item within a guardian's receipt representing a minor family
// member's fee folded into that bill — surfaced on the guardian's Statement
// of Account so it's clear which part of a charge was actually for a dependent.
export interface StatementMinorCharge {
  member_id?: string;
  member_db_id?: number;
  name: string;
  amount: number;
  paid?: boolean;
}

export interface StatementLine {
  // The underlying Receipt's id — lets a caller fetch/print/download the real
  // receipt via receiptsService.getReceiptById(id) instead of just displaying
  // receipt_no as inert text. Multiple lines can share the same id when they
  // were split off of one Receipt (e.g. a bill's split payment legs).
  id?: number;
  date: string;
  receipt_no: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  payment_method?: string;
  status: string;
  minor_charges?: StatementMinorCharge[];
}

export interface MemberStatement {
  member_db_id: string;
  member_id: string;
  member_name: string;
  member_phone?: string;
  is_minor: boolean;
  billed_to_head?: boolean;
  family_head_name?: string;
  opening_balance: number;
  total_billed: number;
  total_paid: number;
  closing_balance: number;
  lines: StatementLine[];
}

class BillingService {

  async getStats(): Promise<BillingStats> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/stats`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch billing stats: ${response.status}`));
    return response.json();
  }

  async getMemberDues(): Promise<MemberDue[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/dues`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch member dues: ${response.status}`));
    return response.json();
  }

  async getMemberPendingBills(memberDbId: number): Promise<Receipt[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/member/${memberDbId}/pending-bills`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch pending bills: ${response.status}`));
    return response.json();
  }

  async getMemberStatement(memberDbId: number, from?: string, to?: string): Promise<MemberStatement> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to)   params.append('to', to);
    const qs = params.toString();
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/member/${memberDbId}/statement${qs ? `?${qs}` : ''}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch member statement: ${response.status}`));
    return response.json();
  }

  async settlePayment(request: SettlePaymentRequest): Promise<Receipt> {
    const body = {
      member_db_id:    request.member_db_id,
      payment_method:  request.payment_method,
      payment_date:    request.payment_date,
      transaction_ref: request.transaction_ref,
      remarks:         request.remarks,
      bill_payments:   request.bill_payments.map(bp => ({
        receipt_id: bp.receipt_id,
        pay_amount: bp.pay_amount,
      })),
      payment_breakdown: request.payment_breakdown,
    };
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/settle`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to settle payment: ${response.status}`));
    return response.json();
  }
}

export const billingService = new BillingService();
