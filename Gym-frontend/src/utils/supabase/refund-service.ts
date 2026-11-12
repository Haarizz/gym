import api from '../../api/axiosConfig';

// Billing › Refunds (backend: MemberRefundController, V136). snake_case on the wire.

export type RefundMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Online' | 'Wallet';

export const REFUND_METHODS: RefundMethod[] = ['Cash', 'Card', 'Bank Transfer', 'Online', 'Wallet'];

export const REFUND_REASONS: { code: string; label: string }[] = [
  { code: 'MEMBER_REQUEST', label: 'Member asked to cancel' },
  { code: 'MEDICAL', label: 'Medical reasons' },
  { code: 'RELOCATION', label: 'Moving away' },
  { code: 'SERVICE_ISSUE', label: 'Unhappy with the service' },
  { code: 'DUPLICATE_PAYMENT', label: 'Paid twice / overpaid' },
  { code: 'BILLING_ERROR', label: 'Billing mistake' },
  { code: 'GOODWILL', label: 'Goodwill gesture' },
  { code: 'OTHER', label: 'Other' },
];

export interface RefundableBill {
  id: number;
  receipt_no: string;
  invoice_no?: string | null;
  date?: string | null;
  type: string;
  plan_name?: string | null;
  valid_from?: string | null;
  valid_till?: string | null;
  amount: number;
  paid: number;
  refunded: number;
  refundable: number;
  due: number;
  status?: string | null;
  can_cancel: boolean;
  current_period: boolean;
  not_started: boolean;
  payment_method?: string | null;
  blocked_reason?: string | null;
}

export interface MemberRefund {
  id: number;
  voucher_no: string;
  date: string;
  created_at?: string | null;
  member_db_id?: number | null;
  member_code?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  receipt_id?: number | null;
  receipt_no?: string | null;
  invoice_no?: string | null;
  bill_type?: string | null;
  plan_name?: string | null;
  amount: number;
  subtotal: number;
  tax: number;
  method?: string | null;
  bank_account_name?: string | null;
  reference?: string | null;
  reason_code?: string | null;
  reason_label?: string | null;
  reason?: string | null;
  notes?: string | null;
  cancelled_plan: boolean;
  due_cleared?: number | null;
  refunded_by?: string | null;
  source?: string | null;
  journal_voucher_id?: number | null;
}

export interface MemberRefundBills {
  member_db_id: number;
  member_id?: string | null;
  name: string;
  phone?: string | null;
  photo_url?: string | null;
  plan?: string | null;
  end_date?: string | null;
  wallet_balance: number;
  outstanding: number;
  total_refundable: number;
  total_refunded: number;
  bills: RefundableBill[];
  refunds: MemberRefund[];
}

export interface RefundSlice { key: string; label: string; count: number; amount: number }

export interface RefundSummary {
  count: number;
  amount: number;
  members: number;
  cancelled_plans: number;
  average: number;
  by_method: RefundSlice[];
  by_reason: RefundSlice[];
  by_type: RefundSlice[];
}

export interface RefundPage {
  rows: MemberRefund[];
  total: number;
  page: number;
  limit: number;
  summary: RefundSummary;
}

export interface RefundRequest {
  receipt_id: number;
  amount: number;
  method: RefundMethod;
  bank_account_code?: string | null;
  bank_account_name?: string | null;
  reference?: string | null;
  reason_code: string;
  notes?: string | null;
  cancel_plan: boolean;
}

export const refundService = {
  memberBills: async (memberDbId: number | string): Promise<MemberRefundBills> =>
    (await api.get<MemberRefundBills>(`/billing/refunds/member/${memberDbId}`)).data,
  list: async (params: { from?: string; to?: string; search?: string; method?: string; reason?: string; page?: number; limit?: number }): Promise<RefundPage> =>
    (await api.get<RefundPage>('/billing/refunds', { params })).data,
  get: async (id: number): Promise<MemberRefund> => (await api.get<MemberRefund>(`/billing/refunds/${id}`)).data,
  refund: async (body: RefundRequest): Promise<MemberRefund> => (await api.post<MemberRefund>('/billing/refunds', body)).data,
};

export const billTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'New': return 'New membership';
    case 'Renewal': return 'Renewal';
    case 'Add-on': return 'Add-on';
    case 'Daily Entry': return 'Day pass';
    case 'Class Booking': return 'Class booking';
    default: return type || 'Bill';
  }
};
