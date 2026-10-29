import api from '../../api/axiosConfig';

// GET /api/payroll-analytics/report?from=yyyy-MM&to=yyyy-MM — one row per employee per month,
// from that month's payroll run when there is one, else from the salary payments made for it
// (their settlement breakdown). Payroll Reports and Payroll Analytics both aggregate these rows.

export type RecordStatus = 'Paid' | 'Unpaid' | 'Draft';

export interface PayrollItem { label: string; amount: number; kind: 'earning' | 'deduction' }
export interface PaymentMethod { mode: string; amount: number }

export interface PayrollAttendance {
  scheduledDays: number;
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateCount: number;
  scheduledHours: number;
  actualHours: number;
  otHours: number;
}

export interface PayrollRecord {
  month: string;          // yyyy-MM
  monthLabel: string;     // "Oct 2026"
  employeeCode: string;
  staffId: number | null;
  name: string;
  department: string;
  designation: string | null;
  source: 'payroll' | 'manual';
  runId: number | null;
  runStatus: string | null;
  status: RecordStatus;
  basic: number;
  allowances: number;
  overtime: number;
  commission: number;
  /** Net of an old payment saved without a breakdown — counted in gross, never guessed into basic. */
  unitemised: number;
  gross: number;
  attendanceDeduction: number;
  advanceRecovery: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  /** An old payment saved before breakdowns were recorded: only the net is known. */
  netOnly?: boolean;
  attendance: PayrollAttendance | null;
  items: PayrollItem[];
  paymentId: number | null;
  paidDate: string | null;
  paidAmount: number;
  methods: PaymentMethod[];
}

export interface PayrollRunSummary {
  id: number;
  month: string;
  label: string;
  status: string;
  employees: number;
  gross: number;
  deductions: number;
  net: number;
  paidCount: number;
  paidAmount: number;
  outstanding: number;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string | null;
}

export interface SalaryPaymentRow {
  id: number;
  month: string | null;
  monthLabel: string;
  employeeCode: string;
  name: string;
  department: string;
  amount: number;
  date: string | null;
  methods: PaymentMethod[];
  source: 'payroll' | 'manual';
  processedBy: string | null;
  notes: string | null;
}

export interface OpenAdvance {
  id: number;
  employeeCode: string;
  name: string;
  department: string;
  type: string | null;
  approved: number;
  recovered: number;
  balance: number;
  installment: number;
  installments: number | null;
  issuedOn: string | null;
  nextDeduction: string | null;
  status: string;
}

export interface PayrollDataset {
  from: string;
  to: string;
  months: { month: string; label: string; current: boolean }[];
  payrollUsed: boolean;
  records: PayrollRecord[];
  runs: PayrollRunSummary[];
  payments: SalaryPaymentRow[];
  advances: {
    outstanding: number;
    openCount: number;
    open: OpenAdvance[];
    monthly: { month: string; label: string; issued: number; recovered: number }[];
  };
  staff: {
    active: number;
    monthlyBase: number;
    joinedInRange: number;
    departments: { department: string; count: number; baseSalary: number }[];
  };
}

const num = (v: unknown) => (v == null || v === '' ? 0 : Number(v) || 0);

function normalise(d: any): PayrollDataset {
  const records: PayrollRecord[] = (d?.records ?? []).map((r: any) => ({
    ...r,
    basic: num(r.basic), allowances: num(r.allowances), overtime: num(r.overtime), commission: num(r.commission),
    unitemised: num(r.unitemised),
    gross: num(r.gross), attendanceDeduction: num(r.attendanceDeduction), advanceRecovery: num(r.advanceRecovery),
    otherDeductions: num(r.otherDeductions), totalDeductions: num(r.totalDeductions), net: num(r.net),
    paidAmount: num(r.paidAmount),
    items: (r.items ?? []).map((i: any) => ({ ...i, amount: num(i.amount) })),
    methods: (r.methods ?? []).map((m: any) => ({ mode: m.mode, amount: num(m.amount) })),
  }));
  return {
    from: d?.from, to: d?.to,
    months: d?.months ?? [],
    payrollUsed: !!d?.payrollUsed,
    records,
    runs: (d?.runs ?? []).map((r: any) => ({
      ...r, gross: num(r.gross), deductions: num(r.deductions), net: num(r.net),
      paidAmount: num(r.paidAmount), outstanding: num(r.outstanding),
    })),
    payments: (d?.payments ?? []).map((p: any) => ({
      ...p, amount: num(p.amount), methods: (p.methods ?? []).map((m: any) => ({ mode: m.mode, amount: num(m.amount) })),
    })),
    advances: {
      outstanding: num(d?.advances?.outstanding),
      openCount: num(d?.advances?.openCount),
      open: (d?.advances?.open ?? []).map((a: any) => ({
        ...a, approved: num(a.approved), recovered: num(a.recovered), balance: num(a.balance), installment: num(a.installment),
      })),
      monthly: (d?.advances?.monthly ?? []).map((m: any) => ({ ...m, issued: num(m.issued), recovered: num(m.recovered) })),
    },
    staff: {
      active: num(d?.staff?.active),
      monthlyBase: num(d?.staff?.monthlyBase),
      joinedInRange: num(d?.staff?.joinedInRange),
      departments: (d?.staff?.departments ?? []).map((x: any) => ({ ...x, count: num(x.count), baseSalary: num(x.baseSalary) })),
    },
  };
}

export const payrollReportService = {
  async get(from: string, to: string): Promise<PayrollDataset> {
    const res = await api.get('/payroll-analytics/report', { params: { from, to } });
    return normalise(res.data?.data ?? res.data);
  },
};

export function payrollErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}

// ── Months ──────────────────────────────────────────────────────────────────

/** yyyy-MM for a date. */
export const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ym(d);
}

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

export function monthLabel(month: string, long = false): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: 'numeric' });
}

export function rangeText(from: string, to: string): string {
  return from === to ? monthLabel(from, true) : `${monthLabel(from)} – ${monthLabel(to)}`;
}

// ── Aggregation ─────────────────────────────────────────────────────────────

export interface Totals {
  basic: number;
  allowances: number;
  overtime: number;
  commission: number;
  unitemised: number;
  gross: number;
  attendanceDeduction: number;
  advanceRecovery: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  paid: number;
  unpaid: number;
  draft: number;
  otHours: number;
  absentDays: number;
  unpaidLeaveDays: number;
  lateCount: number;
  /** distinct employees */
  employees: number;
  /** employee-months (rows) */
  rows: number;
  /** months with at least one row */
  months: number;
}

export function totals(records: PayrollRecord[]): Totals {
  const t: Totals = {
    basic: 0, allowances: 0, overtime: 0, commission: 0, unitemised: 0, gross: 0, attendanceDeduction: 0, advanceRecovery: 0,
    otherDeductions: 0, totalDeductions: 0, net: 0, paid: 0, unpaid: 0, draft: 0, otHours: 0, absentDays: 0, unpaidLeaveDays: 0, lateCount: 0,
    employees: 0, rows: records.length, months: 0,
  };
  const people = new Set<string>();
  const months = new Set<string>();
  for (const r of records) {
    t.basic += r.basic; t.allowances += r.allowances; t.overtime += r.overtime; t.commission += r.commission;
    t.unitemised += r.unitemised;
    t.gross += r.gross; t.attendanceDeduction += r.attendanceDeduction; t.advanceRecovery += r.advanceRecovery;
    t.otherDeductions += r.otherDeductions; t.totalDeductions += r.totalDeductions; t.net += r.net;
    // what was actually paid out (a line settled with nothing to pay adds 0)
    if (r.status === 'Paid') t.paid += r.paidAmount;
    else if (r.status === 'Unpaid') t.unpaid += r.net;
    else t.draft += r.net;
    t.otHours += r.attendance?.otHours ?? 0;
    t.absentDays += r.attendance?.absentDays ?? 0;
    t.unpaidLeaveDays += r.attendance?.unpaidLeaveDays ?? 0;
    t.lateCount += r.attendance?.lateCount ?? 0;
    people.add(r.employeeCode);
    months.add(r.month);
  }
  t.employees = people.size;
  t.months = months.size;
  return t;
}

export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r); else m.set(k, [r]);
  }
  return m;
}

/** % change; null when there's nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** Average monthly cost per employee: gross ÷ employee-months. */
export const costPerHead = (t: Totals) => (t.rows ? t.gross / t.rows : 0);
/** Average paid headcount per month. */
export const avgHeadcount = (t: Totals, monthCount: number) => (monthCount ? t.rows / monthCount : 0);
