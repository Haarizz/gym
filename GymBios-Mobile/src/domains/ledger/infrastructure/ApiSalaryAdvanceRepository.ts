import { apiClient } from '@/core/network/apiClient';
import type {
  CreateSalaryAdvanceInput,
  LedgerRole,
  SalaryAdvance,
  SalaryAdvanceOverview,
} from '../domain/SalaryAdvance';

interface RawAdvance {
  id: number;
  request_date?: string | null;
  requested_amount?: number | string | null;
  approved_amount?: number | string | null;
  status?: string | null;
  remarks?: string | null;
  installment_count?: number | null;
  installment_amount?: number | string | null;
  start_month?: string | null;
  next_deduction_date?: string | null;
  total_deducted?: number | string | null;
  balance?: number | string | null;
  approved_date?: string | null;
  rejection_note?: string | null;
}

interface RawOverview {
  limits?: {
    base_salary?: number | string | null;
    outstanding?: number | string | null;
    available?: number | string | null;
    has_pending?: boolean;
    can_request?: boolean;
    reason_blocked?: string | null;
  };
  advances?: RawAdvance[];
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

function mapAdvance(raw: RawAdvance): SalaryAdvance {
  return {
    id: raw.id,
    requestDate: raw.request_date ?? null,
    requestedAmount: num(raw.requested_amount),
    approvedAmount: num(raw.approved_amount),
    status: raw.status ?? 'Pending Approval',
    remarks: raw.remarks ?? null,
    installmentCount: raw.installment_count ?? 0,
    installmentAmount: num(raw.installment_amount),
    startMonth: raw.start_month ?? null,
    nextDeductionDate: raw.next_deduction_date ?? null,
    totalDeducted: num(raw.total_deducted),
    balance: num(raw.balance),
    approvedDate: raw.approved_date ?? null,
    rejectionNote: raw.rejection_note ?? null,
  };
}

const base = (role: LedgerRole) => `/mobile/${role}/salary-advances`;

/** The signed-in staff member's or trainer's own salary advance requests. */
export const salaryAdvanceRepository = {
  async list(role: LedgerRole): Promise<SalaryAdvanceOverview> {
    const { data } = await apiClient.get<RawOverview>(base(role));
    const l = data?.limits ?? {};
    return {
      limits: {
        baseSalary: num(l.base_salary),
        outstanding: num(l.outstanding),
        available: num(l.available),
        hasPending: !!l.has_pending,
        canRequest: !!l.can_request,
        reasonBlocked: l.reason_blocked ?? null,
      },
      advances: (data?.advances ?? []).map(mapAdvance),
    };
  },

  async create(role: LedgerRole, input: CreateSalaryAdvanceInput): Promise<SalaryAdvance> {
    const { data } = await apiClient.post<RawAdvance>(base(role), input);
    return mapAdvance(data);
  },

  async cancel(role: LedgerRole, id: number): Promise<SalaryAdvance> {
    const { data } = await apiClient.post<RawAdvance>(`${base(role)}/${id}/cancel`);
    return mapAdvance(data);
  },
};
