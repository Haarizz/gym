import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface ContraVoucher {
  id: string;
  voucherNo: string;
  date: string;
  fromAccountCode: string;
  fromAccountName?: string;
  toAccountCode: string;
  toAccountName?: string;
  amount: number;
  narration?: string;
  reference?: string;
  status: string;
  journalVoucherId?: string;
  createdAt?: string;
}

export interface ContraVoucherCreateRequest {
  date: string;
  fromAccountCode: string;
  fromAccountName?: string;
  toAccountCode: string;
  toAccountName?: string;
  amount: number;
  narration?: string;
  reference?: string;
}

function mapContraVoucher(r: any): ContraVoucher {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    date: r.date ?? "",
    fromAccountCode: r.from_account_code ?? r.fromAccountCode ?? "",
    fromAccountName: r.from_account_name ?? r.fromAccountName,
    toAccountCode: r.to_account_code ?? r.toAccountCode ?? "",
    toAccountName: r.to_account_name ?? r.toAccountName,
    amount: Number(r.amount ?? 0),
    narration: r.narration,
    reference: r.reference,
    status: r.status ?? "DRAFT",
    journalVoucherId: r.journal_voucher_id != null ? String(r.journal_voucher_id) : undefined,
    createdAt: r.created_at ?? r.createdAt,
  };
}

function toBody(req: ContraVoucherCreateRequest) {
  return {
    date: req.date,
    from_account_code: req.fromAccountCode,
    from_account_name: req.fromAccountName,
    to_account_code: req.toAccountCode,
    to_account_name: req.toAccountName,
    amount: req.amount,
    narration: req.narration,
    reference: req.reference,
  };
}

class ContraVoucherService {
  async getAll(): Promise<ContraVoucher[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/contra-vouchers`);
    if (!res.ok) throw new Error("Failed to load contra vouchers");
    const data = await res.json();
    return (data ?? []).map(mapContraVoucher);
  }

  async create(req: ContraVoucherCreateRequest): Promise<ContraVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/contra-vouchers`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to create contra voucher");
    return mapContraVoucher(await res.json());
  }

  async post(id: string): Promise<ContraVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/contra-vouchers/${id}/post`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to post contra voucher");
    return mapContraVoucher(await res.json());
  }

  async cancel(id: string): Promise<ContraVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/contra-vouchers/${id}/cancel`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to cancel contra voucher");
    return mapContraVoucher(await res.json());
  }
}

export const contraVoucherService = new ContraVoucherService();
