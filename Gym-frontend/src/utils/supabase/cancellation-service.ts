import api from '../../api/axiosConfig';
import type { MemberRefund } from './refund-service';

// Members › Cancel membership (backend: MembershipCancellationService, V139). snake_case on the wire.

export type CancelRefundMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Online';
export type DuesAction = 'WRITE_OFF' | 'DEDUCT';

export interface CancellationPolicy {
  allow_cancellation: boolean;
  allow_refund: boolean;
  method: 'prorated' | 'flat' | 'none';
  cancellation_fee: number;
  approval_required: boolean;
}

export interface CancelAddon { name?: string | null; category?: string | null; start?: string | null; end?: string | null; status?: string | null; amount: number }
export interface CancelBooking { id: number; name?: string | null; type?: string | null; date?: string | null; start_time?: string | null; paid: boolean }
export interface CancelPackage { name?: string | null; sessions_total?: number | null; sessions_used: number; end_date?: string | null; status?: string | null }

export interface CancelPerson {
  member_db_id: number;
  member_id?: string | null;
  name: string;
  phone?: string | null;
  photo_url?: string | null;
  head: boolean;
  plan?: string | null;
  status?: string | null;
  join_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  member_for_days: number;
  period_days: number;
  days_used: number;
  days_left: number;
  check_ins: number;
  check_ins_this_period: number;
  last_check_in?: string | null;
  addons: CancelAddon[];
  upcoming_bookings: CancelBooking[];
  past_bookings: number;
  packages: CancelPackage[];
  wallet_balance: number;
  suspended: boolean;
  frozen: boolean;
}

export interface CancelDue {
  receipt_id: number;
  receipt_no?: string | null;
  member_db_id?: number | null;
  member_name?: string | null;
  type?: string | null;
  description: string;
  date?: string | null;
  amount: number;
  paid: number;
  owed: number;
  expiry_due: boolean;
}

export interface CancelQuoteBill {
  receipt_id: number;
  receipt_no?: string | null;
  invoice_no?: string | null;
  member_db_id?: number | null;
  member_name?: string | null;
  type?: string | null;
  plan_name?: string | null;
  valid_from?: string | null;
  valid_till?: string | null;
  paid: number;
  refunded: number;
  refundable: number;
  policy_amount: number;
  basis: string;
}

export interface CancelHold { since?: string | null; by?: string | null; reason?: string | null; notes?: string | null; wants_refund: boolean }

export interface CancellationPreview {
  member_db_id: number;
  member_id?: string | null;
  name: string;
  photo_url?: string | null;
  status?: string | null;
  policy: CancellationPolicy;
  reasons: string[];
  household: CancelPerson[];
  dues: CancelDue[];
  dues_total: number;
  expiry_dues_total: number;
  refund_bills: CancelQuoteBill[];
  refundable_total: number;
  policy_subtotal: number;
  cancellation_fee: number;
  policy_total: number;
  wallet_total: number;
  can_cancel: boolean;
  blocked_reason?: string | null;
  can_refund: boolean;
  refund_blocked_reason?: string | null;
  hold?: CancelHold | null;
  billed_to_head: boolean;
  head_name?: string | null;
  refund_methods: CancelRefundMethod[];
  /** GymOS "Approval Required" is on and this user isn't an Admin / Manager: actions become requests. */
  needs_approval: boolean;
  pending_request?: CancelPendingRequest | null;
}

export interface CancelPendingRequest {
  id: number;
  with_refund: boolean;
  refund_amount: number;
  refund_method?: string | null;
  dues_action?: string | null;
  reason?: string | null;
  notes?: string | null;
  requested_by?: string | null;
  requested_at?: string | null;
}

export interface CancelRequestRow {
  id: number;
  member_db_id: number;
  member_code?: string | null;
  member_name?: string | null;
  photo_url?: string | null;
  plan?: string | null;
  household_size: number;
  with_refund: boolean;
  refund_amount: number;
  policy_amount: number;
  refund_method?: string | null;
  dues_action?: string | null;
  dues_amount: number;
  reason?: string | null;
  notes?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by?: string | null;
  requested_at?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
}

export interface CancellationResult {
  /** PENDING_APPROVAL: only sent for approval — nothing changed yet. */
  outcome: 'CANCELLED' | 'PENDING_APPROVAL';
  cancellation_id?: number | null;
  request_id?: number | null;
  members: string[];
  refund_amount: number;
  dues_written_off: number;
  dues_deducted: number;
  net_paid_out: number;
  expiry_dues_cancelled: number;
  revenue_kept: number;
  bookings_cancelled: number;
  addons_cancelled: number;
  refunds: MemberRefund[];
}

export interface RefundCancelRequest {
  reason: string;
  notes?: string | null;
  dues_action?: DuesAction | null;
  amount: number;
  method: CancelRefundMethod;
  bank_account_code?: string | null;
  bank_account_name?: string | null;
  reference?: string | null;
  refund_reason_code?: string | null;
}

/** What the Members dialog hands to Billing › Refunds when "Cancel with refund" is chosen. */
export interface CancelHandoff { reason: string; notes?: string; dues_action?: DuesAction | null }

export const cancellationService = {
  preview: async (memberDbId: number | string): Promise<CancellationPreview> =>
    (await api.get<CancellationPreview>(`/members/${memberDbId}/cancellation`)).data,
  cancel: async (memberDbId: number | string, body: { reason: string; notes?: string | null; dues_action?: DuesAction | null }): Promise<CancellationResult> =>
    (await api.post<CancellationResult>(`/members/${memberDbId}/cancellation`, body)).data,
  hold: async (memberDbId: number | string, body: { reason: string; notes?: string | null; wants_refund: boolean }): Promise<CancellationPreview> =>
    (await api.post<CancellationPreview>(`/members/${memberDbId}/cancellation/hold`, body)).data,
  releaseHold: async (memberDbId: number | string): Promise<CancellationPreview> =>
    (await api.delete<CancellationPreview>(`/members/${memberDbId}/cancellation/hold`)).data,
  requests: async (status: 'PENDING' | 'DECIDED' = 'PENDING'): Promise<CancelRequestRow[]> =>
    (await api.get<CancelRequestRow[]>('/members/cancellation-requests', { params: { status } })).data,
  canApprove: async (): Promise<boolean> =>
    (await api.get<{ can_approve: boolean }>('/members/cancellation-requests/can-approve')).data.can_approve,
  approve: async (id: number): Promise<CancellationResult> =>
    (await api.post<CancellationResult>(`/members/cancellation-requests/${id}/approve`)).data,
  reject: async (id: number, note: string): Promise<void> => {
    await api.post(`/members/cancellation-requests/${id}/reject`, { note });
  },
  withdraw: async (id: number): Promise<void> => {
    await api.post(`/members/cancellation-requests/${id}/withdraw`);
  },
  cancelWithRefund: async (memberDbId: number | string, body: RefundCancelRequest): Promise<CancellationResult> =>
    (await api.post<CancellationResult>(`/billing/refunds/cancellation/${memberDbId}`, body)).data,
};

/** Billing › Refunds deep link that opens the cancellation refund for this member. */
export const cancelRefundPath = (memberDbId: number | string) => `/billing?tab=refunds&cancel=${memberDbId}`;
