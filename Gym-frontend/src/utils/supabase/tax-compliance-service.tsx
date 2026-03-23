import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface TaxComplianceItem {
  id: number;
  taxType: string;
  taxPeriod: string;
  dueDate: string;
  filedDate: string | null;
  filingAmount: number | null;
  status: string;
  notes: string | null;
  filingReference: string | null;
  documentUrl: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxComplianceCreateRequest {
  taxType: string;
  taxPeriod: string;
  dueDate: string;
  filingAmount?: number;
  status?: string;
  notes?: string;
  documentUrl?: string;
}

export interface MarkFiledRequest {
  filedDate?: string;
  filingAmount?: number;
  filingReference?: string;
}

function mapItem(r: any): TaxComplianceItem {
  return {
    id: r.id,
    taxType: r.tax_type,
    taxPeriod: r.tax_period,
    dueDate: r.due_date,
    filedDate: r.filed_date ?? null,
    filingAmount: r.filing_amount ?? null,
    status: r.status,
    notes: r.notes ?? null,
    filingReference: r.filing_reference ?? null,
    documentUrl: r.document_url ?? null,
    isOverdue: r.is_overdue ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

class TaxComplianceService {
  async getAll(params?: { taxType?: string; status?: string }): Promise<TaxComplianceItem[]> {
    const query = new URLSearchParams();
    if (params?.taxType) query.set("tax_type", params.taxType);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/tax-compliance${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch tax compliance");
    return (await res.json()).map(mapItem);
  }

  async create(req: TaxComplianceCreateRequest): Promise<TaxComplianceItem> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tax_type: req.taxType,
        tax_period: req.taxPeriod,
        due_date: req.dueDate,
        filing_amount: req.filingAmount ?? null,
        status: req.status ?? "PENDING",
        notes: req.notes ?? null,
        document_url: req.documentUrl ?? null,
      }),
    });
    if (!res.ok) throw new Error("Failed to create tax compliance item");
    return mapItem(await res.json());
  }

  async update(id: number, req: TaxComplianceCreateRequest): Promise<TaxComplianceItem> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-compliance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tax_type: req.taxType,
        tax_period: req.taxPeriod,
        due_date: req.dueDate,
        filing_amount: req.filingAmount ?? null,
        status: req.status ?? "PENDING",
        notes: req.notes ?? null,
        document_url: req.documentUrl ?? null,
      }),
    });
    if (!res.ok) throw new Error("Failed to update tax compliance item");
    return mapItem(await res.json());
  }

  async markFiled(id: number, req: MarkFiledRequest): Promise<TaxComplianceItem> {
    const body: any = {};
    if (req.filedDate) body.filed_date = req.filedDate;
    if (req.filingAmount !== undefined) body.filing_amount = String(req.filingAmount);
    if (req.filingReference) body.filing_reference = req.filingReference;
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/tax-compliance/${id}/mark-filed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error("Failed to mark as filed");
    return mapItem(await res.json());
  }

  async delete(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/tax-compliance/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete tax compliance item");
  }
}

export const taxComplianceService = new TaxComplianceService();
