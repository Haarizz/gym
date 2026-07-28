import { authService } from './auth-service';
import { Receipt } from './receipts-service';

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

class BillingService {

  async getStats(): Promise<BillingStats> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/stats`
    );
    if (!response.ok) throw new Error(`Failed to fetch billing stats: ${response.status}`);
    return response.json();
  }

  async getMemberDues(): Promise<MemberDue[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/dues`
    );
    if (!response.ok) throw new Error(`Failed to fetch member dues: ${response.status}`);
    return response.json();
  }

  async getMemberPendingBills(memberDbId: number): Promise<Receipt[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/member/${memberDbId}/pending-bills`
    );
    if (!response.ok) throw new Error(`Failed to fetch pending bills: ${response.status}`);
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
    if (!response.ok) throw new Error(`Failed to settle payment: ${response.status}`);
    return response.json();
  }
}

export const billingService = new BillingService();
