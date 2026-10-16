import { authService } from './auth-service';
import { parseApiError } from './api-error';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Shifts are the gym's wall-clock times while clock-ins are stored on the server clock (UTC): the
// backend uses the branch time zone, else this browser's, to line them up.
const CLIENT_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();

// ── Types ───────────────────────────────────────────────────────────────────

export type ShiftType = 'fixed' | 'flexible' | 'rotational' | 'split' | 'overnight';
export type ShiftStatus = 'active' | 'draft' | 'inactive';
export type OvertimePolicy = 'eligible' | 'approval' | 'none';

export interface Shift {
  id: number;
  name: string;
  code: string | null;
  shift_type: ShiftType;
  status: ShiftStatus;
  check_in: string;
  check_out: string;
  break_start: string | null;
  break_end: string | null;
  grace_in_minutes: number;
  grace_out_minutes: number;
  ot_after_minutes: number;
  max_daily_ot_hours: number | null;
  max_weekly_hours: number | null;
  overtime_policy: OvertimePolicy;
  work_days: string[];
  departments: string[];
  effective_from: string | null;
  effective_to: string | null;
  overnight: boolean;
  net_minutes: number;
  break_minutes: number;
  assigned_count: number;
}

export interface EmployeeSchedule {
  staff_id: number;
  staff_code: string | null;
  name: string;
  role: string | null;
  department: string | null;
  branch: string | null;
  photo_url: string | null;
  shift_id: number | null;
  assignment_id: number | null;
  effective_from: string | null;
  effective_to: string | null;
  upcoming_shift_id: number | null;
  upcoming_from: string | null;
}

export interface RosterCell { date: string; shift_id: number | null; working: boolean; roster_change: boolean; }
export interface RosterRow {
  staff_id: number; name: string; role: string | null; department: string | null; photo_url: string | null;
  days: RosterCell[];
}

export type AttendanceStatus =
  | 'Present' | 'Late' | 'Early Departure' | 'Absent' | 'Half Day' | 'Weekly Off' | 'Holiday'
  | 'Paid Leave' | 'Unpaid Leave' | 'Incomplete Punch' | 'Overtime' | 'Working' | 'Scheduled' | 'No Shift';
export type ApprovalStatus = 'Auto-Approved' | 'Pending' | 'Approved' | 'Rejected';

export interface AttendanceDay {
  id: string;
  staff_id: number;
  staff_code: string | null;
  staff_name: string;
  role: string | null;
  department: string | null;
  photo_url: string | null;
  date: string;
  shift_id: number | null;
  shift_name: string | null;
  shift_code: string | null;
  scheduled: boolean;
  roster_change: boolean;
  scheduled_in: string | null;
  scheduled_out: string | null;
  actual_in: string | null;
  actual_out: string | null;
  break_minutes: number;
  scheduled_minutes: number;
  worked_minutes: number;
  late_minutes: number;
  early_minutes: number;
  ot_minutes: number;
  approved_ot_minutes: number;
  overtime_policy: OvertimePolicy;
  status: AttendanceStatus;
  status_override: string | null;
  approval_status: ApprovalStatus;
  note: string | null;
  punch_count: number;
  pending_correction: boolean;
}

export interface AttendanceSummary {
  staff_id: number;
  staff_code: string | null;
  staff_name: string;
  role: string | null;
  department: string | null;
  photo_url: string | null;
  shift_name: string | null;
  scheduled_days: number;
  present: number;
  absent: number;
  paid_leave: number;
  unpaid_leave: number;
  weekly_off: number;
  holidays: number;
  upcoming_days: number;
  late_count: number;
  incomplete_punches: number;
  pending_ot_days: number;
  scheduled_hours: number;
  actual_hours: number;
  late_hours: number;
  early_hours: number;
  regular_hours: number;
  ot_hours: number;
  approved_ot_hours: number;
  attendance_rate: number | null;
}

export interface AttendanceCorrection {
  id: number;
  staff_id: number;
  staff_name: string;
  staff_code: string | null;
  role: string | null;
  photo_url: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  day_status: string | null;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  review_note: string | null;
  requested_by: string | null;
  requested_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface DeductionType {
  id: number;
  name: string;
  code: string;
  calc_method: 'Fixed' | 'Percentage' | 'Per Day' | 'Per Hour';
  recurring: boolean;
  requires_approval: boolean;
  active: boolean;
}

export type DeductionStatus = 'Draft' | 'Pending' | 'Active' | 'Paused' | 'Completed' | 'Rejected' | 'Cancelled';

export interface EmployeeDeduction {
  id: number;
  staff_id: number;
  staff_name: string;
  staff_code: string | null;
  department: string | null;
  photo_url: string | null;
  type_id: number;
  type_name: string | null;
  type_code: string | null;
  calc_method: DeductionType['calc_method'];
  amount: number;
  quantity: number;
  monthly_amount: number;
  frequency: 'One-Time' | 'Monthly';
  installments: number;
  completed_installments: number;
  start_month: string;
  reason: string | null;
  status: DeductionStatus;
  approved_by: string | null;
  created_at: string | null;
}

export type InstallmentStatus = 'Upcoming' | 'Due' | 'Overdue' | 'Processed' | 'Skipped';

export interface AdvanceInstallment {
  id: string;
  advance_id: number;
  employee_id: string;
  employee_name: string;
  installment_no: number | null; // null for a skipped month
  installments: number;
  due_month: string;
  scheduled_amount: number;
  actual_amount: number;
  balance_before: number;
  balance_after: number;
  status: InstallmentStatus;
  repayment_id: number | null;
  source: 'manual' | 'payroll' | null;
}

export interface WorkforceTransaction {
  date: string;
  employee_name: string;
  reference: string;
  description: string;
  amount: number;
  period: string;
  type: 'Advance Issued' | 'Advance Repayment' | 'Other Deduction' | 'Attendance Deduction';
}

// Disbursed: legacy runs closed before payroll was paid through Salary Payments
export type PayrollRunStatus = 'Draft' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disbursed';

export interface PayrollLine {
  id: number;
  staff_id: number;
  employee_code: string | null;
  employee_name: string;
  designation: string | null;
  department: string | null;
  basic_salary: number;
  allowances: number;
  scheduled_days: number;
  present_days: number;
  absent_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  late_count: number;
  scheduled_hours: number;
  actual_hours: number;
  regular_hours: number;
  approved_ot_hours: number;
  ot_pay: number;
  commission: number;
  attendance_deduction: number;
  advance_repayment: number;
  other_deductions: number;
  gross_pay: number;
  net_pay: number;
  salary_payment_id: number | null;
  paid_at: string | null;
  breakdown: {
    has_shift: boolean;
    allowances: Array<{ name: string; amount: number }>;
    per_day_rate: number;
    rate_days?: number;   // working days of a full month on the shift pattern (rate basis)
    rate_hours?: number;
    ot_rate: number;
    ot_multiplier: number;
    commission: Record<string, number>;
    advances: Array<{ advance_id: number; advance_type: string; installment_no: number; installments: number; amount: number; due_month: string }>;
    deductions: Array<{ deduction_id: number; type: string; code: string | null; amount: number; reason: string | null; installment_no: number; installments: number }>;
    attendance: AttendanceSummary;
    net_floored_by?: number;
  } | null;
}

export interface PayrollRun {
  id: number;
  period: string;
  period_label: string;
  year: number;
  month: number;
  status: PayrollRunStatus;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  disbursed_by: string | null;
  disbursed_at: string | null;   // when the last employee was paid
  paid_count: number;
  paid_total: number;
  lines?: PayrollLine[];
}

export interface PayrollReadiness {
  period: string;
  employees: number;
  undecided_commission_staff: number;
  undecided_commission_total: number;
  pending_ot_days: number;
  incomplete_punches: number;
  pending_corrections: number;
  employees_without_shift: number;
  deductible_absence_days: number;
  month_running: boolean;
}

export type CommissionStatus = 'estimated' | 'pending' | 'approved' | 'paid' | 'rejected';
export type CommissionCategory = 'memberships' | 'pos';

export interface CommissionCategoryFigures {
  category: CommissionCategory;
  units: number;
  revenue: number;
  computed_commission: number;
  commission: number;
  status: CommissionStatus;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  payroll_run_id: number | null;
}

export interface CommissionMonth {
  period: string;
  target_id: number | null;
  revenue_target: number;
  revenue: number;
  unit_targets: Array<{ service: string; target_units: number; achieved_units?: number }>;
  units: Record<string, number>;
  categories: CommissionCategoryFigures[];
}

export interface CommissionStaffRow {
  staff_id: number;
  staff_code: string | null;
  name: string;
  role: string | null;
  department: string | null;
  branch: string | null;
  photo_url: string | null;
  rule: {
    configured: boolean;
    role: string | null;
    base_commission: number;
    admission_commission: number;
    pos_commission: number | null;
    pos_commission_per_sale: number | null;
  };
  months: CommissionMonth[];
}

export interface CommissionOverview {
  periods: string[];
  current_period: string;
  rows: CommissionStaffRow[];
}

// ── Request helper ──────────────────────────────────────────────────────────

async function request<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const res = await authService.makeAuthenticatedRequest(`${BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...(CLIENT_TZ ? { "X-Client-Timezone": CLIENT_TZ } : {}) },
  });
  if (!res.ok) throw new Error(await parseApiError(res, fallback));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });
const del: RequestInit = { method: 'DELETE' };

// ── Services ────────────────────────────────────────────────────────────────

export const shiftsService = {
  list: () => request<Shift[]>('/shifts', 'Failed to load shifts'),
  create: (body: Partial<Shift>) => request<Shift>('/shifts', 'Failed to create shift', post(body)),
  update: (id: number, body: Partial<Shift>) => request<Shift>(`/shifts/${id}`, 'Failed to save shift', put(body)),
  duplicate: (id: number) => request<Shift>(`/shifts/${id}/duplicate`, 'Failed to duplicate shift', post()),
  remove: (id: number) => request<void>(`/shifts/${id}`, 'Failed to delete shift', del),
  schedules: (date?: string) =>
    request<EmployeeSchedule[]>(`/shifts/schedules${date ? `?date=${date}` : ''}`, 'Failed to load schedules'),
  assign: (body: { shift_id: number; staff_ids: number[]; effective_from: string; effective_to?: string | null }) =>
    request<{ assigned: number }>('/shifts/assign', 'Failed to assign shift', post(body)),
  unassign: (body: { staff_ids: number[]; effective_from: string }) =>
    request<{ unassigned: number }>('/shifts/unassign', 'Failed to remove shift', post(body)),
  roster: (from: string, to: string) =>
    request<{ from: string; to: string; rows: RosterRow[] }>(`/shifts/roster?from=${from}&to=${to}`, 'Failed to load roster'),
  setRosterDay: (body: { staff_id: number; date: string; mode: 'shift' | 'off' | 'default'; shift_id?: number | null }) =>
    request<void>('/shifts/roster/day', 'Failed to update roster', post(body)),
  copyPreviousWeek: (weekStart: string) =>
    request<{ copied: number }>(`/shifts/roster/copy-week?week_start=${weekStart}`, 'Failed to copy last week', post()),
};

export const staffAttendanceAdminService = {
  daily: (from: string, to: string, staffId?: number) =>
    request<AttendanceDay[]>(`/staff-attendance/daily?from=${from}&to=${to}${staffId ? `&staff_id=${staffId}` : ''}`,
      'Failed to load attendance'),
  monthly: (year: number, month: number) =>
    request<AttendanceSummary[]>(`/staff-attendance/monthly?year=${year}&month=${month}`, 'Failed to load monthly summary'),
  decide: (body: { staff_id: number; date: string; approval_status?: 'Approved' | 'Rejected' | null; approved_ot_minutes?: number | null; day_status?: string | null; note?: string | null }) =>
    request<void>('/staff-attendance/decisions', 'Failed to save decision', post(body)),
  decideMany: (items: Array<{ staff_id: number; date: string; approval_status: 'Approved' | 'Rejected' }>) =>
    request<{ updated: number }>('/staff-attendance/decisions/bulk', 'Failed to save decisions', post(items)),
  corrections: () => request<AttendanceCorrection[]>('/staff-attendance/corrections', 'Failed to load corrections'),
  requestCorrection: (body: { staff_id: number; date: string; check_in?: string | null; check_out?: string | null; day_status?: string | null; reason: string }) =>
    request<{ id: number }>('/staff-attendance/corrections', 'Failed to submit correction', post(body)),
  approveCorrection: (id: number, note?: string) =>
    request<void>(`/staff-attendance/corrections/${id}/approve`, 'Failed to approve correction', post({ note })),
  rejectCorrection: (id: number, note?: string) =>
    request<void>(`/staff-attendance/corrections/${id}/reject`, 'Failed to reject correction', post({ note })),
  withdrawCorrection: (id: number) =>
    request<void>(`/staff-attendance/corrections/${id}`, 'Failed to withdraw correction', del),
};

export const deductionsService = {
  list: () => request<EmployeeDeduction[]>('/deductions', 'Failed to load deductions'),
  create: (body: Record<string, unknown>) => request<EmployeeDeduction>('/deductions', 'Failed to add deduction', post(body)),
  update: (id: number, body: Record<string, unknown>) => request<EmployeeDeduction>(`/deductions/${id}`, 'Failed to save deduction', put(body)),
  action: (id: number, action: 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'cancel') =>
    request<EmployeeDeduction>(`/deductions/${id}/${action}`, `Failed to ${action} deduction`, post()),
  remove: (id: number) => request<void>(`/deductions/${id}`, 'Failed to delete deduction', del),
  types: () => request<DeductionType[]>('/deductions/types', 'Failed to load deduction types'),
  createType: (body: Partial<DeductionType>) => request<DeductionType>('/deductions/types', 'Failed to add deduction type', post(body)),
  updateType: (id: number, body: Partial<DeductionType>) => request<DeductionType>(`/deductions/types/${id}`, 'Failed to save deduction type', put(body)),
};

export const advanceScheduleService = {
  schedule: (advanceId?: number) =>
    request<AdvanceInstallment[]>(`/salary-advances/schedule${advanceId ? `?advance_id=${advanceId}` : ''}`, 'Failed to load repayment schedule'),
  transactions: () => request<WorkforceTransaction[]>('/salary-advances/transactions', 'Failed to load transactions'),
  recordRepayment: (advanceId: number, body: { period_month: string; amount?: number; note?: string }) =>
    request<void>(`/salary-advances/${advanceId}/repayments`, 'Failed to record repayment', post(body)),
  skip: (advanceId: number, body: { period_month: string; note?: string }) =>
    request<void>(`/salary-advances/${advanceId}/skip`, 'Failed to skip installment', post(body)),
};

export const payrollRunService = {
  list: () => request<PayrollRun[]>('/payroll/runs', 'Failed to load payroll runs'),
  get: (id: number) => request<PayrollRun>(`/payroll/runs/${id}`, 'Failed to load payroll run'),
  generate: (year: number, month: number, notes?: string) =>
    request<PayrollRun>('/payroll/runs', 'Failed to generate payroll', post({ year, month, notes })),
  approve: (id: number) => request<PayrollRun>(`/payroll/runs/${id}/approve`, 'Failed to approve payroll', post()),
  reopen: (id: number) => request<PayrollRun>(`/payroll/runs/${id}/reopen`, 'Failed to reopen payroll', post()),
  remove: (id: number) => request<void>(`/payroll/runs/${id}`, 'Failed to delete payroll run', del),
  readiness: (year: number, month: number) =>
    request<PayrollReadiness>(`/payroll/readiness?year=${year}&month=${month}`, 'Failed to check payroll readiness'),
};

export const commissionEarningsService = {
  overview: (from: string, to: string, staffId?: number) =>
    request<CommissionOverview>(`/commission-earnings?from=${from}&to=${to}${staffId ? `&staff_id=${staffId}` : ''}`,
      'Failed to load commission'),
  decide: (action: 'approve' | 'reject' | 'pay' | 'reset',
           body: { staff_id: number; period: string; category: CommissionCategory; note?: string }) =>
    request<void>(`/commission-earnings/${action}`, `Failed to ${action} commission`, post(body)),
  approveAll: (period: string) =>
    request<{ approved: number }>('/commission-earnings/bulk/approve', 'Failed to approve commission', post({ period })),
};
