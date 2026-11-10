import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const base = `${backendBaseUrl}/billing/pending-payments`;

export type WriteOffReason = 'UNCOLLECTABLE' | 'DISCONTINUED' | 'MANAGEMENT_DECISION' | 'OLD_BALANCE' | 'OTHER';

export const WRITE_OFF_REASONS: { value: WriteOffReason; label: string }[] = [
  { value: 'UNCOLLECTABLE', label: 'Uncollectable payment' },
  { value: 'DISCONTINUED', label: 'Member discontinued membership' },
  { value: 'MANAGEMENT_DECISION', label: 'Special management decision' },
  { value: 'OLD_BALANCE', label: 'Old outstanding balance' },
  { value: 'OTHER', label: 'Other' },
];

export const writeOffReasonLabel = (reason: string) =>
  WRITE_OFF_REASONS.find(r => r.value === reason)?.label ?? reason;

interface Pagination { page: number; limit: number; total: number; total_pages: number }

/** An open member bill: what was billed, what has come in, and what is still owed. */
export interface PendingDue {
  receipt_id: number;
  receipt_no: string | null;
  invoice_no: string | null;
  member_db_id: number | null;
  member_code: string | null;
  member_name: string | null;
  member_phone: string | null;
  description: string;
  remarks: string | null;
  bill_date: string | null;
  due_date: string | null;
  original_amount: number;
  paid_amount: number;
  amount_due: number;
  overdue: boolean;
  days_overdue: number;
}

export interface PendingDuePage {
  items: PendingDue[];
  pagination: Pagination;
  all_count: number;
  overdue_count: number;
  upcoming_count: number;
}

export interface PendingPaymentStats {
  total_due: number;
  open_count: number;
  overdue_amount: number;
  overdue_count: number;
  upcoming_amount: number;
  upcoming_count: number;
  written_off_amount: number;
  write_off_count: number;
}

export interface WriteOffRecord {
  id: number;
  receipt_id: number;
  receipt_no: string | null;
  invoice_no: string | null;
  member_db_id: number | null;
  member_code: string | null;
  member_name: string | null;
  member_phone: string | null;
  bill_description: string | null;
  bill_date: string | null;
  due_date: string | null;
  original_amount: number;
  paid_amount: number;
  written_off_amount: number;
  reason: WriteOffReason;
  notes: string | null;
  written_off_by: string;
  written_off_at: string;
}

export interface WriteOffPage {
  items: WriteOffRecord[];
  pagination: Pagination;
  total_amount: number;
  /** Everyone who wrote something off in the period — for the "Written off by" filter. */
  staff: string[];
}

export interface ReportGroup { key: string; label: string; count: number; amount: number }

export interface WriteOffReport {
  from: string | null;
  to: string | null;
  total_amount: number;
  count: number;
  by_reason: ReportGroup[];
  by_staff: ReportGroup[];
  by_month: ReportGroup[];
  by_member: ReportGroup[];
}

export type DueFilter = 'all' | 'overdue' | 'upcoming';

function query(params: Record<string, string | number | null | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function get<T>(url: string, what: string): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(url);
  if (!response.ok) throw new Error(await parseApiError(response, `Failed to load ${what} (${response.status})`));
  return response.json();
}

export const pendingPaymentsService = {
  list(params: { search?: string; filter?: DueFilter; sort?: 'due_date' | 'amount'; dir?: 'asc' | 'desc'; page?: number; limit?: number }) {
    return get<PendingDuePage>(`${base}${query(params)}`, 'pending payments');
  },

  stats(from?: string, to?: string) {
    return get<PendingPaymentStats>(`${base}/stats${query({ from, to })}`, 'pending payment totals');
  },

  async writeOff(receiptId: number, reason: WriteOffReason, notes?: string): Promise<WriteOffRecord> {
    const response = await authService.makeAuthenticatedRequest(`${base}/${receiptId}/write-off`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes: notes?.trim() || null }),
    });
    if (!response.ok) throw new Error(await parseApiError(response, `Write-off failed (${response.status})`));
    return response.json();
  },

  history(params: { search?: string; from?: string; to?: string; reason?: string; written_by?: string; sort?: 'date' | 'amount'; dir?: 'asc' | 'desc'; page?: number; limit?: number }) {
    return get<WriteOffPage>(`${base}/write-offs${query(params)}`, 'write-off history');
  },

  report(from?: string, to?: string) {
    return get<WriteOffReport>(`${base}/write-offs/report${query({ from, to })}`, 'write-off report');
  },
};
