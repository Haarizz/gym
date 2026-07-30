import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BillEntry {
  id?: string;
  billNo: string;
  billDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: string;
}

export interface PaymentSplitLeg {
  method: string;
  amount: number;
  reference?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNo: string;
  supplierName: string;
  supplierType: string;
  billNo?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  paymentBreakdown?: PaymentSplitLeg[];
  status: string;
  description: string;
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  bills: BillEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentVoucherCreateRequest {
  supplierName: string;
  supplierType: string;
  billNo?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  paymentBreakdown?: PaymentSplitLeg[];
  status?: string;
  description: string;
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
  bills?: BillEntry[];
}

function mapBill(b: any): BillEntry {
  return {
    id: b.id ? String(b.id) : undefined,
    billNo: b.bill_no ?? b.billNo ?? "",
    billDate: b.bill_date ?? b.billDate ?? "",
    originalAmount: Number(b.original_amount ?? b.originalAmount ?? 0),
    paidAmount: Number(b.paid_amount ?? b.paidAmount ?? 0),
    remainingBalance: Number(b.remaining_balance ?? b.remainingBalance ?? 0),
    dueDate: b.due_date ?? b.dueDate ?? "",
    status: b.status ?? "Pending",
  };
}

function mapPaymentVoucher(r: any): PaymentVoucher {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    supplierName: r.supplier_name ?? r.supplierName ?? "",
    supplierType: r.supplier_type ?? r.supplierType ?? "Supplier",
    billNo: r.bill_no ?? r.billNo,
    paymentDate: r.payment_date ?? r.paymentDate ?? "",
    amount: Number(r.amount ?? 0),
    paymentMethod: r.payment_method ?? r.paymentMethod ?? "",
    paymentBreakdown: r.payment_breakdown ?? r.paymentBreakdown,
    status: r.status ?? "Pending",
    description: r.description ?? "",
    bankAccount: r.bank_account ?? r.bankAccount,
    chequeNo: r.cheque_no ?? r.chequeNo,
    chequeDate: r.cheque_date ?? r.chequeDate,
    notes: r.notes,
    bills: (r.bills ?? []).map(mapBill),
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function toBody(req: PaymentVoucherCreateRequest) {
  return {
    supplier_name: req.supplierName,
    supplier_type: req.supplierType,
    bill_no: req.billNo,
    payment_date: req.paymentDate,
    amount: req.amount,
    payment_method: req.paymentMethod,
    payment_breakdown: req.paymentBreakdown,
    status: req.status,
    description: req.description,
    bank_account: req.bankAccount,
    cheque_no: req.chequeNo,
    cheque_date: req.chequeDate,
    notes: req.notes,
    bills: (req.bills ?? []).map((b) => ({
      bill_no: b.billNo,
      bill_date: b.billDate,
      original_amount: b.originalAmount,
      paid_amount: b.paidAmount,
      remaining_balance: b.remainingBalance,
      due_date: b.dueDate,
      status: b.status,
    })),
  };
}

class PaymentVoucherService {
  async getPaymentVouchers(filters: {
    search?: string;
    status?: string;
    supplierType?: string;
  } = {}): Promise<PaymentVoucher[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.supplierType) params.append("supplier_type", filters.supplierType);

    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/payment-vouchers?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to load payment vouchers");
    const data = await res.json();
    return (data ?? []).map(mapPaymentVoucher);
  }

  async getPaymentVoucher(id: string): Promise<PaymentVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payment-vouchers/${id}`);
    if (!res.ok) throw new Error("Failed to load payment voucher");
    return mapPaymentVoucher(await res.json());
  }

  async createPaymentVoucher(req: PaymentVoucherCreateRequest): Promise<PaymentVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payment-vouchers`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to create payment voucher");
    return mapPaymentVoucher(await res.json());
  }

  async updatePaymentVoucher(id: string, req: PaymentVoucherCreateRequest): Promise<PaymentVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payment-vouchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to update payment voucher");
    return mapPaymentVoucher(await res.json());
  }

  async updateStatus(id: string, status: string): Promise<PaymentVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payment-vouchers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update payment voucher status");
    return mapPaymentVoucher(await res.json());
  }

  async deletePaymentVoucher(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payment-vouchers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete payment voucher");
  }
}

export const paymentVoucherService = new PaymentVoucherService();
