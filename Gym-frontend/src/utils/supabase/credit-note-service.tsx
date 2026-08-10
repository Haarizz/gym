import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface CreditNote {
  id: string;
  voucherNo: string;
  date: string;
  memberDbId?: string;
  memberName?: string;
  linkedReceiptId?: string;
  reason?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  refundMethod: string;
  status: string;
  journalVoucherId?: string;
}

export interface CreditNoteCreateRequest {
  date: string;
  memberDbId?: string;
  memberName?: string;
  linkedReceiptId?: string;
  reason?: string;
  subtotal: number;
  taxAmount?: number;
  refundMethod?: string;
}

function mapCreditNote(r: any): CreditNote {
  return {
    id: String(r.id),
    voucherNo: r.voucher_no ?? r.voucherNo ?? "",
    date: r.date ?? "",
    memberDbId: r.member_db_id != null ? String(r.member_db_id) : undefined,
    memberName: r.member_name ?? r.memberName,
    linkedReceiptId: r.linked_receipt_id != null ? String(r.linked_receipt_id) : undefined,
    reason: r.reason,
    subtotal: Number(r.subtotal ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    refundMethod: r.refund_method ?? r.refundMethod ?? "Cash",
    status: r.status ?? "DRAFT",
    journalVoucherId: r.journal_voucher_id != null ? String(r.journal_voucher_id) : undefined,
  };
}

function toBody(req: CreditNoteCreateRequest) {
  return {
    date: req.date,
    member_db_id: req.memberDbId,
    member_name: req.memberName,
    linked_receipt_id: req.linkedReceiptId,
    reason: req.reason,
    subtotal: req.subtotal,
    tax_amount: req.taxAmount ?? 0,
    refund_method: req.refundMethod ?? "Cash",
  };
}

class CreditNoteService {
  async getAll(): Promise<CreditNote[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/credit-notes`);
    if (!res.ok) throw new Error("Failed to load credit notes");
    const data = await res.json();
    return (data ?? []).map(mapCreditNote);
  }

  async create(req: CreditNoteCreateRequest): Promise<CreditNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/credit-notes`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to create credit note");
    return mapCreditNote(await res.json());
  }

  async post(id: string): Promise<CreditNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/credit-notes/${id}/post`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to post credit note");
    return mapCreditNote(await res.json());
  }

  async cancel(id: string): Promise<CreditNote> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/credit-notes/${id}/cancel`, { method: "POST" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to cancel credit note");
    return mapCreditNote(await res.json());
  }
}

export const creditNoteService = new CreditNoteService();
