import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface SplitPayment {
  id?: string;
  mode: string;
  amount: number;
  reference: string;
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
  };
}

class SalaryPaymentsService {
  async getEmployees(filters: { search?: string; department?: string; status?: string } = {}): Promise<SalaryPaymentEmployee[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.department) params.append("department", filters.department);
    if (filters.status) params.append("status", filters.status);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments/employees?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load salary payment employees");
    const data = await res.json();
    return (data ?? []).map(mapEmployee);
  }

  async getPayments(filters: { employeeId?: string; month?: string; year?: number } = {}): Promise<SalaryPaymentHistory[]> {
    const params = new URLSearchParams();
    if (filters.employeeId) params.append("employeeId", filters.employeeId);
    if (filters.month) params.append("month", filters.month);
    if (filters.year) params.append("year", String(filters.year));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load salary payment history");
    const data = await res.json();
    return (data ?? []).map(mapPayment);
  }

  async createPayment(req: SalaryPaymentCreateRequest): Promise<SalaryPaymentHistory> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments`, {
      method: "POST",
      body: JSON.stringify(toPaymentBody(req)),
    });
    if (!res.ok) throw new Error("Failed to process salary payment");
    return mapPayment(await res.json());
  }

  async createBulkPayments(reqs: SalaryPaymentCreateRequest[]): Promise<SalaryPaymentHistory[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-payments/bulk`, {
      method: "POST",
      body: JSON.stringify(reqs.map(toPaymentBody)),
    });
    if (!res.ok) throw new Error("Failed to process bulk payments");
    const data = await res.json();
    return (data ?? []).map(mapPayment);
  }
}

export const salaryPaymentsService = new SalaryPaymentsService();
