import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface ReceiptVoucher {
  id: string;
  voucherNo: string;
  date: string;
  source: string;
  sourceCategory: string;
  memberId?: number;
  memberName: string;
  amount: number;
  paymentMode: string;
  status: string;
  branch: string;
  reference: string;
  notes: string;
  transactionId?: string;
  approvedBy?: string;
  voucherType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptVoucherCreateRequest {
  date: string;
  source: string;
  sourceCategory: string;
  memberId?: number;
  memberName: string;
  amount: number;
  paymentMode: string;
  status?: string;
  branch: string;
  reference: string;
  notes?: string;
  transactionId?: string;
  approvedBy?: string;
  voucherType?: string;
}

function mapReceiptVoucher(r: any): ReceiptVoucher {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    date: r.date ?? "",
    source: r.source ?? "",
    sourceCategory: r.source_category ?? r.sourceCategory ?? "",
    memberId: r.member_id ?? r.memberId,
    memberName: r.member_name ?? r.memberName ?? "",
    amount: Number(r.amount ?? 0),
    paymentMode: r.payment_mode ?? r.paymentMode ?? "",
    status: r.status ?? "draft",
    branch: r.branch ?? "",
    reference: r.reference ?? "",
    notes: r.notes ?? "",
    transactionId: r.transaction_id ?? r.transactionId,
    approvedBy: r.approved_by ?? r.approvedBy,
    voucherType: r.voucher_type ?? r.voucherType,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function toBody(req: ReceiptVoucherCreateRequest) {
  return {
    date: req.date,
    source: req.source,
    source_category: req.sourceCategory,
    member_id: req.memberId,
    member_name: req.memberName,
    amount: req.amount,
    payment_mode: req.paymentMode,
    status: req.status,
    branch: req.branch,
    reference: req.reference,
    notes: req.notes,
    transaction_id: req.transactionId,
    approved_by: req.approvedBy,
    voucher_type: req.voucherType,
  };
}

class ReceiptVoucherService {
  async getReceiptVouchers(filters: {
    search?: string;
    status?: string;
    branch?: string;
    sourceCategory?: string;
    from?: string;
    to?: string;
  } = {}): Promise<ReceiptVoucher[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.branch) params.append("branch", filters.branch);
    if (filters.sourceCategory) params.append("source_category", filters.sourceCategory);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);

    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/receipt-vouchers?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to load receipt vouchers");
    const data = await res.json();
    return (data ?? []).map(mapReceiptVoucher);
  }

  async getReceiptVoucher(id: string): Promise<ReceiptVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/receipt-vouchers/${id}`);
    if (!res.ok) throw new Error("Failed to load receipt voucher");
    return mapReceiptVoucher(await res.json());
  }

  async createReceiptVoucher(req: ReceiptVoucherCreateRequest): Promise<ReceiptVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/receipt-vouchers`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to create receipt voucher");
    return mapReceiptVoucher(await res.json());
  }

  async updateReceiptVoucher(id: string, req: ReceiptVoucherCreateRequest): Promise<ReceiptVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/receipt-vouchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to update receipt voucher");
    return mapReceiptVoucher(await res.json());
  }

  async updateStatus(id: string, status: string): Promise<ReceiptVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/receipt-vouchers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update receipt voucher status");
    return mapReceiptVoucher(await res.json());
  }

  async deleteReceiptVoucher(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/receipt-vouchers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete receipt voucher");
  }
}

export const receiptVoucherService = new ReceiptVoucherService();
