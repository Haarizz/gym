import { authService } from "./auth-service";
import { parseApiError } from "./api-error";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface SplitPayment {
  id?: string;
  mode: string;
  amount: number;
  reference: string;
}

/** One thing a salary paid without payroll covers (earning, advance installment, deduction). */
export interface SalaryPayItem {
  key: string;
  kind: "earning" | "advance" | "deduction" | "fixed";
  label: string;
  amount: number;
  refId: number | null;
}

/** What a payment covered (kept on the payment; printed on the voucher). */
export interface SalarySettlement {
  source: "manual" | "payroll";
  basic: number;
  earnings: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  gross: number;
  totalDeductions: number;
  net: number;
}

export interface SalaryPaymentEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "Paid" | "Pending" | "On Hold";
  lastPaymentDate: Date | null;
  bankAccount?: string;
  email?: string;
  /** Set when the month has a payroll run: amounts come from the employee's line on it once approved. */
  payrollRunId?: number | null;
  payrollRunLineId?: number | null;
  payrollRunStatus?: string | null;
  grossPay?: number | null;
  /** No payroll line: the month's allowances, commission, advance installments and deductions. */
  items?: SalaryPayItem[] | null;
  /** The gym has run payroll before (only then is "no payroll this month" worth mentioning). */
  payrollUsed?: boolean;
}

export interface SalaryPaymentHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  netSalary: number;
  splitPayments: SplitPayment[];
  paymentDate: Date;
  notes: string;
  status: "Paid";
  processedBy: string;
  /** Payment voucher posted to Financials for this payment. */
  voucherNo?: string | null;
  settlement?: SalarySettlement | null;
}

export interface SalaryPaymentCreateRequest {
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  netSalary: number;
  splitPayments: SplitPayment[];
  paymentDate: string;
  notes?: string;
  processedBy?: string;
  /** Pays this approved payroll line (amount must equal its net pay). */
  payrollRunLineId?: number | null;
  /** Without payroll: settle these of the employee's items (+ free extras); netSalary must match. */
  applyItems?: boolean;
  itemKeys?: string[];
  extraAllowance?: number;
  extraDeduction?: number;
}

function mapEmployee(r: any): SalaryPaymentEmployee {
  const lastPaymentRaw = r.last_payment_date ?? r.lastPaymentDate ?? null;
  return {
    id: String(r.id),
    employeeId: r.employee_id ?? r.employeeId ?? "",
    name: r.employee_name ?? r.employeeName ?? "",
    department: r.department ?? "",
    designation: r.designation ?? "",
    baseSalary: Number(r.base_salary ?? r.baseSalary ?? 0),
    allowances: Number(r.allowances ?? 0),
    deductions: Number(r.deductions ?? 0),
    netSalary: Number(r.net_salary ?? r.netSalary ?? 0),
    paymentStatus: (r.payment_status ?? r.paymentStatus ?? "Pending") as SalaryPaymentEmployee["paymentStatus"],
    lastPaymentDate: lastPaymentRaw ? new Date(lastPaymentRaw) : null,
    bankAccount: r.bank_account ?? r.bankAccount,
    email: r.email,
    payrollRunId: r.payroll_run_id ?? null,
    payrollRunLineId: r.payroll_run_line_id ?? null,
    payrollRunStatus: r.payroll_run_status ?? null,
    grossPay: r.gross_pay != null ? Number(r.gross_pay) : null,
    items: Array.isArray(r.items) ? r.items.map((i: any) => ({
      key: i.key, kind: i.kind, label: i.label, amount: Number(i.amount ?? 0), refId: i.ref_id ?? null,
    })) : null,
    payrollUsed: !!r.payroll_used,
  };
}

function mapPayment(r: any): SalaryPaymentHistory {
  const paymentDate = r.payment_date ?? r.paymentDate ?? null;
  const splitPayments = (r.split_payments ?? r.splitPayments ?? []).map((s: any, idx: number) => ({
    id: String(s.id ?? idx + 1),
    mode: s.mode,
    amount: Number(s.amount ?? 0),
    reference: s.reference ?? "",
  }));
  return {
    id: String(r.id),
    employeeId: r.employee_id ?? r.employeeId ?? "",
    employeeName: r.employee_name ?? r.employeeName ?? "",
    month: r.month ?? "",
    year: Number(r.year ?? 0),
    netSalary: Number(r.net_salary ?? r.netSalary ?? 0),
    splitPayments,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    notes: r.notes ?? "",
    status: "Paid",
    processedBy: r.processed_by ?? r.processedBy ?? "HR Manager",
    voucherNo: r.voucher_no ?? r.voucherNo ?? null,
    settlement: r.settlement ? {
      source: r.settlement.source,
      basic: Number(r.settlement.basic ?? 0),
      earnings: (r.settlement.earnings ?? []).map((e: any) => ({ label: e.label, amount: Number(e.amount ?? 0) })),
      deductions: (r.settlement.deductions ?? []).map((e: any) => ({ label: e.label, amount: Number(e.amount ?? 0) })),
      gross: Number(r.settlement.gross ?? 0),
      totalDeductions: Number(r.settlement.total_deductions ?? 0),
      net: Number(r.settlement.net ?? 0),
    } : null,
  };
}

function toPaymentBody(req: SalaryPaymentCreateRequest) {
  return {
    employee_id: req.employeeId,
    employee_name: req.employeeName,
    month: req.month,
    year: req.year,
    net_salary: req.netSalary,
    split_payments: req.splitPayments.map(s => ({
      mode: s.mode,
      amount: s.amount,
      reference: s.reference,
    })),
    payment_date: req.paymentDate,
    notes: req.notes,
    processed_by: req.processedBy,
    payroll_run_line_id: req.payrollRunLineId ?? undefined,
    apply_items: req.applyItems || undefined,
    item_keys: req.applyItems ? req.itemKeys ?? [] : undefined,
    extra_allowance: req.applyItems ? req.extraAllowance ?? 0 : undefined,
    extra_deduction: req.applyItems ? req.extraDeduction ?? 0 : undefined,
  };
}

class SalaryPaymentsService {
  /** Employees with their payment status for the given month (default: the current month). */
  async getEmployees(filters: { search?: string; department?: string; status?: string; month?: string; year?: number } = {}): Promise<SalaryPaymentEmployee[]> {
    const params = new URLSearchParams();
    if (filters.month) params.append("month", filters.month);
    if (filters.year) params.append("year", String(filters.year));
    if (filters.search) params.append("search", filters.search);
    if (filters.department) params.append("department", filters.department);
    if (filters.status) params.append("status", filters.status);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments/employees?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, "Failed to load salary payment employees"));
    const data = await res.json();
    return (data ?? []).map(mapEmployee);
  }

  async getPayments(filters: { employeeId?: string; month?: string; year?: number } = {}): Promise<SalaryPaymentHistory[]> {
    const params = new URLSearchParams();
    if (filters.employeeId) params.append("employeeId", filters.employeeId);
    if (filters.month) params.append("month", filters.month);
    if (filters.year) params.append("year", String(filters.year));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, "Failed to load salary payment history"));
    const data = await res.json();
    return (data ?? []).map(mapPayment);
  }

  async createPayment(req: SalaryPaymentCreateRequest): Promise<SalaryPaymentHistory> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments`, {
      method: "POST",
      body: JSON.stringify(toPaymentBody(req)),
    });
    if (!res.ok) throw new Error(await parseApiError(res, "Failed to process salary payment"));
    return mapPayment(await res.json());
  }

  async createBulkPayments(reqs: SalaryPaymentCreateRequest[]): Promise<SalaryPaymentHistory[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments/bulk`, {
      method: "POST",
      body: JSON.stringify(reqs.map(toPaymentBody)),
    });
    if (!res.ok) throw new Error(await parseApiError(res, "Failed to process bulk payments"));
    const data = await res.json();
    return (data ?? []).map(mapPayment);
  }
}

export const salaryPaymentsService = new SalaryPaymentsService();
