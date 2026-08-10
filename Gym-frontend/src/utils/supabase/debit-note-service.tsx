import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface DebitNote {
  id: string;
  voucherNo: string;
  date: string;
  supplierId?: string;
  supplierName?: string;
  linkedBillId?: string;
  reason?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  journalVoucherId?: string;
}

export interface DebitNoteCreateRequest {
  date: string;
  supplierId?: string;
  supplierName?: string;
  linkedBillId?: string;
  reason?: string;
  subtotal: number;
  taxAmount?: number;
}

function mapDebitNote(r: any): DebitNote {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    date: r.date ?? "",
    supplierId: r.supplier_id != null ? String(r.supplier_id) : undefined,
    supplierName: r.supplier_name ?? r.supplierName,
    linkedBillId: r.linked_bill_id != null ? String(r.linked_bill_id) : undefined,
    reason: r.reason,
    subtotal: Number(r.subtotal ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    status: r.status ?? "DRAFT",
    journalVoucherId: r.journal_voucher_id != null ? String(r.journal_voucher_id) : undefined,
  };
}

function toBody(req: DebitNoteCreateRequest) {
  return {
    date: req.date,
    supplier_id: req.supplierId,
    supplier_name: req.supplierName,
    linked_bill_id: req.linkedBillId,
    reason: req.reason,
    subtotal: req.subtotal,
    tax_amount: req.taxAmount ?? 0,
  };
}

class DebitNoteService {
  async getAll(): Promise<DebitNote[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/debit-notes`);
    if (!res.ok) throw new Error("Failed to load debit notes");
    const data = await res.json();
    return (data ?? []).map(mapDebitNote);
  }

  async create(req: DebitNoteCreateRequest): Promise<DebitNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/debit-notes`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to create debit note");
    return mapDebitNote(await res.json());
  }

  async post(id: string): Promise<DebitNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/debit-notes/${id}/post`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to post debit note");
    return mapDebitNote(await res.json());
  }

  async cancel(id: string): Promise<DebitNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/debit-notes/${id}/cancel`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to cancel debit note");
    return mapDebitNote(await res.json());
  }
}

export const debitNoteService = new DebitNoteService();
