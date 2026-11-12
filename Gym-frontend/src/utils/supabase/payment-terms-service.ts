import api from '../../api/axiosConfig';

// GymOS › Settings › Payment Terms (backend: PaymentTermsController, V135). snake_case on the wire.

export type PaymentTermsKind =
  | 'registration' | 'renewal' | 'upgrade' | 'downgrade' | 'freeze'
  | 'addon' | 'personal_training' | 'dues' | 'day_pass' | 'sales_invoice';

/** Desk payments a terms set can be attached to, in display order. The POS never asks. */
export const PAYMENT_TERMS_KINDS: { kind: PaymentTermsKind; label: string; hint: string }[] = [
  { kind: 'registration', label: 'New membership', hint: 'Add Member and new family members' },
  { kind: 'renewal', label: 'Renewal', hint: 'Renewing on the same plan' },
  { kind: 'upgrade', label: 'Upgrade', hint: 'Moving to a higher-priced plan' },
  { kind: 'downgrade', label: 'Downgrade', hint: 'Moving to a lower-priced plan' },
  { kind: 'freeze', label: 'Freeze', hint: 'Freezing a membership, incl. paid extra days' },
  { kind: 'addon', label: 'Add-ons & facilities', hint: 'Add-ons and facility access' },
  { kind: 'personal_training', label: 'Personal training', hint: 'Selling PT / training packages' },
  { kind: 'dues', label: 'Paying dues', hint: 'Collecting outstanding balances in Billing' },
  { kind: 'day_pass', label: 'Walk-in day pass', hint: 'Check In › Walk-in' },
  { kind: 'sales_invoice', label: 'Sales invoices', hint: 'Settling a sales invoice (not the POS)' },
];

export const paymentTermsKindLabel = (kind: string) =>
  PAYMENT_TERMS_KINDS.find(k => k.kind === kind)?.label ?? kind;

export interface PaymentTerms {
  id: number;
  branch_id: number;
  title: string;
  content: string;
  applies_to: PaymentTermsKind[];
  enabled: boolean;
  sort_order: number;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface PaymentTermsRequest {
  title?: string;
  content?: string;
  applies_to?: PaymentTermsKind[];
  enabled?: boolean;
  sort_order?: number;
}

export interface PaymentTermsAcceptance {
  id: number;
  payment_kind: PaymentTermsKind;
  member_db_id?: number | null;
  member_name?: string | null;
  amount?: number | null;
  terms_id?: number | null;
  terms_title: string;
  terms_version: number;
  accepted_by?: string | null;
  accepted_at: string;
}

export interface PaymentTermsAcceptRequest {
  kind: PaymentTermsKind;
  branch_id?: number | null;
  member_db_id?: number | null;
  member_name?: string | null;
  amount?: number | null;
  terms_ids: number[];
}

const branchParam = (branchId?: number | null) => (branchId != null ? { branchId } : {});

export const paymentTermsService = {
  list: async (branchId?: number | null): Promise<PaymentTerms[]> =>
    (await api.get<PaymentTerms[]>('/payment-terms', { params: branchParam(branchId) })).data,
  create: async (branchId: number | null, body: PaymentTermsRequest): Promise<PaymentTerms> =>
    (await api.post<PaymentTerms>('/payment-terms', body, { params: branchParam(branchId) })).data,
  update: async (id: number, body: PaymentTermsRequest): Promise<PaymentTerms> =>
    (await api.put<PaymentTerms>(`/payment-terms/${id}`, body)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/payment-terms/${id}`); },
  reorder: async (branchId: number | null, ids: number[]): Promise<PaymentTerms[]> =>
    (await api.put<PaymentTerms[]>('/payment-terms/order', ids, { params: branchParam(branchId) })).data,

  active: async (kind: PaymentTermsKind, branchId?: number | null): Promise<PaymentTerms[]> =>
    (await api.get<PaymentTerms[]>('/payment-terms/active', { params: { kind, ...branchParam(branchId) } })).data,
  accept: async (body: PaymentTermsAcceptRequest): Promise<PaymentTermsAcceptance[]> =>
    (await api.post<PaymentTermsAcceptance[]>('/payment-terms/accept', body)).data,

  log: async (branchId?: number | null, limit = 50): Promise<{ total: number; rows: PaymentTermsAcceptance[] }> =>
    (await api.get('/payment-terms/acceptances', { params: { limit, ...branchParam(branchId) } })).data,
  acceptance: async (id: number): Promise<{ acceptance: PaymentTermsAcceptance; terms_content: string }> =>
    (await api.get(`/payment-terms/acceptances/${id}`)).data,
};

/** Message of an axios error from the backend (GlobalExceptionHandler puts it in `message`). */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const any = e as { response?: { data?: { message?: string } }; message?: string };
  return any?.response?.data?.message || any?.message || fallback;
}
