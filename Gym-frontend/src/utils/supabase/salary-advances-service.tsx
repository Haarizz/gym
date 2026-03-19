import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface SalaryAdvance {
  id: number;
  employeeId: string;
  employeeName: string;
  department: string;
  requestDate: Date;
  advanceType: string;
  requestedAmount: number;
  approvedAmount: number;
  approvalStatus: string;
  remarks: string;
  totalDeducted: number;
  balance: number;
  installmentCount: number;
  installmentAmount: number;
  startMonth: Date | null;
  deductionMode: string;
  autoDeduct: boolean;
  status: string;
  nextDeductionDate: Date | null;
  approvedBy: string | null;
  approvedDate: Date | null;
  attachment: string | null;
}

export interface SalaryAdvanceCreateRequest {
  employeeId: string;
  employeeName: string;
  department: string;
  requestDate: string;
  advanceType: string;
  requestedAmount: number;
  remarks?: string;
  attachment?: string | null;
}

export interface SalaryAdvanceApprovalRequest {
  approvedAmount: number;
  approvalStatus: string;
  installmentCount: number;
  deductionMode: string;
  startMonth: string;
  autoDeduct: boolean;
  approvalRemarks?: string;
  approvedBy?: string;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  return new Date(value);
}

function mapAdvance(r: any): SalaryAdvance {
  return {
    id: Number(r.id),
    employeeId: r.employee_id ?? r.employeeId ?? "",
    employeeName: r.employee_name ?? r.employeeName ?? "",
    department: r.department ?? "",
    requestDate: toDate(r.request_date ?? r.requestDate) || new Date(),
    advanceType: r.advance_type ?? r.advanceType ?? "",
    requestedAmount: Number(r.requested_amount ?? r.requestedAmount ?? 0),
    approvedAmount: Number(r.approved_amount ?? r.approvedAmount ?? 0),
    approvalStatus: r.approval_status ?? r.approvalStatus ?? "Pending",
    remarks: r.remarks ?? "",
    totalDeducted: Number(r.total_deducted ?? r.totalDeducted ?? 0),
    balance: Number(r.balance ?? 0),
    installmentCount: Number(r.installment_count ?? r.installmentCount ?? 0),
    installmentAmount: Number(r.installment_amount ?? r.installmentAmount ?? 0),
    startMonth: toDate(r.start_month ?? r.startMonth),
    deductionMode: r.deduction_mode ?? r.deductionMode ?? "Monthly",
    autoDeduct: Boolean(r.auto_deduct ?? r.autoDeduct ?? true),
    status: r.status ?? "",
    nextDeductionDate: toDate(r.next_deduction_date ?? r.nextDeductionDate),
    approvedBy: r.approved_by ?? r.approvedBy ?? null,
    approvedDate: toDate(r.approved_date ?? r.approvedDate),
    attachment: r.attachment ?? null,
  };
}

function toCreateBody(req: SalaryAdvanceCreateRequest) {
  return {
    employee_id: req.employeeId,
    employee_name: req.employeeName,
    department: req.department,
    request_date: req.requestDate,
    advance_type: req.advanceType,
    requested_amount: req.requestedAmount,
    remarks: req.remarks,
    attachment: req.attachment,
  };
}

function toApprovalBody(req: SalaryAdvanceApprovalRequest) {
  return {
    approved_amount: req.approvedAmount,
    approval_status: req.approvalStatus,
    installment_count: req.installmentCount,
    deduction_mode: req.deductionMode,
    start_month: req.startMonth,
    auto_deduct: req.autoDeduct,
    approval_remarks: req.approvalRemarks,
    approved_by: req.approvedBy,
  };
}

class SalaryAdvancesService {
  async getAdvances(filters: { search?: string; status?: string; department?: string } = {}): Promise<SalaryAdvance[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.department) params.append("department", filters.department);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-advances?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load salary advances");
    const data = await res.json();
    return (data ?? []).map(mapAdvance);
  }

  async createAdvance(req: SalaryAdvanceCreateRequest): Promise<SalaryAdvance> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-advances`, {
      method: "POST",
      body: JSON.stringify(toCreateBody(req)),
    });
    if (!res.ok) throw new Error("Failed to create salary advance");
    return mapAdvance(await res.json());
  }

  async updateAdvance(id: number, req: SalaryAdvanceCreateRequest): Promise<SalaryAdvance> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-advances/${id}`, {
      method: "PUT",
      body: JSON.stringify(toCreateBody(req)),
    });
    if (!res.ok) throw new Error("Failed to update salary advance");
    return mapAdvance(await res.json());
  }

  async approveAdvance(id: number, req: SalaryAdvanceApprovalRequest): Promise<SalaryAdvance> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-advances/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(toApprovalBody(req)),
    });
    if (!res.ok) throw new Error("Failed to approve salary advance");
    return mapAdvance(await res.json());
  }

  async deleteAdvance(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/salary-advances/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete salary advance");
  }
}

export const salaryAdvancesService = new SalaryAdvancesService();
