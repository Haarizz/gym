import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface JournalVoucherLine {
  id?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
}

export interface JournalVoucher {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  status: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalVoucherLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalVoucherCreateRequest {
  date: string;
  narration: string;
  status?: string;
  reference?: string;
  lines: JournalVoucherLine[];
}

function mapLine(l: any): JournalVoucherLine {
  return {
    id: l.id ? String(l.id) : undefined,
    accountCode: l.account_code ?? l.accountCode ?? "",
    accountName: l.account_name ?? l.accountName ?? "",
    debit: Number(l.debit ?? 0),
    credit: Number(l.credit ?? 0),
    description: l.description,
    costCenter: l.cost_center ?? l.costCenter,
  };
}

function mapJournalVoucher(r: any): JournalVoucher {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    date: r.date ?? "",
    narration: r.narration ?? "",
    status: r.status ?? "DRAFT",
    reference: r.reference,
    totalDebit: Number(r.total_debit ?? r.totalDebit ?? 0),
    totalCredit: Number(r.total_credit ?? r.totalCredit ?? 0),
    lines: (r.lines ?? []).map(mapLine),
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function toBody(req: JournalVoucherCreateRequest) {
  return {
    date: req.date,
    narration: req.narration,
    status: req.status,
    reference: req.reference,
    lines: req.lines.map((l) => ({
      account_code: l.accountCode,
      account_name: l.accountName,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      cost_center: l.costCenter,
    })),
  };
}

class JournalVoucherService {
  async getJournalVouchers(filters: { search?: string; status?: string } = {}): Promise<JournalVoucher[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load journal vouchers");
    const data = await res.json();
    return (data ?? []).map(mapJournalVoucher);
  }

  async getJournalVoucher(id: string): Promise<JournalVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers/${id}`);
    if (!res.ok) throw new Error("Failed to load journal voucher");
    return mapJournalVoucher(await res.json());
  }

  async createJournalVoucher(req: JournalVoucherCreateRequest): Promise<JournalVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to create journal voucher");
    return mapJournalVoucher(await res.json());
  }

  async updateJournalVoucher(id: string, req: JournalVoucherCreateRequest): Promise<JournalVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error("Failed to update journal voucher");
    return mapJournalVoucher(await res.json());
  }

  async postJournalVoucher(id: string): Promise<JournalVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers/${id}/post`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to post journal voucher");
    return mapJournalVoucher(await res.json());
  }

  async cancelJournalVoucher(id: string): Promise<JournalVoucher> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers/${id}/cancel`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to cancel journal voucher");
    return mapJournalVoucher(await res.json());
  }

  async deleteJournalVoucher(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/journal-vouchers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete journal voucher");
  }
}

export const journalVoucherService = new JournalVoucherService();
