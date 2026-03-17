import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WastageReturnItem {
  id?: number;
  voucherId?: number;
  productId?: number;
  productName: string;
  sku: string;
  batchNo?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  reasonSpecific?: string;
}

export interface WastageReturn {
  id: number;
  voucherNumber: string;
  date: string;
  type: 'WASTAGE' | 'GOODS_RETURN';
  associatedParty?: string;
  partyType: 'SUPPLIER' | 'CUSTOMER' | 'NONE';
  reason: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  location: string;
  recordedBy?: string;
  approvedBy?: string;
  totalItems: number;
  totalValue: number;
  notes?: string;
  approvalDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  items: WastageReturnItem[];
}

export interface WastageReturnRequest {
  date: string;
  type: 'WASTAGE' | 'GOODS_RETURN';
  associatedParty?: string;
  partyType: 'SUPPLIER' | 'CUSTOMER' | 'NONE';
  reason: string;
  location: string;
  recordedBy?: string;
  notes?: string;
  items: WastageReturnItemRequest[];
}

export interface WastageReturnItemRequest {
  productId?: number;
  productName: string;
  sku: string;
  batchNo?: string;
  quantity: number;
  unitCost: number;
  unit: string;
  reasonSpecific?: string;
}

export interface WastageReturnStats {
  totalVouchers: number;
  pendingApproval: number;
  totalWastageValue: number;
  totalReturnValue: number;
  monthlyWastage: number;
  monthlyReturns: number;
  topWastedProducts: { name: string; value: number; quantity: number }[];
  topReturnReasons: { reason: string; count: number; value: number }[];
}

export interface WastageReturnPage {
  vouchers: WastageReturn[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapItem(r: any): WastageReturnItem {
  return {
    id: r.id,
    voucherId: r.voucher_id ?? r.voucherId,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    sku: r.sku ?? '',
    batchNo: r.batch_no ?? r.batchNo,
    quantity: Number(r.quantity ?? 0),
    unitCost: Number(r.unit_cost ?? r.unitCost ?? 0),
    totalCost: Number(r.total_cost ?? r.totalCost ?? 0),
    unit: r.unit ?? '',
    reasonSpecific: r.reason_specific ?? r.reasonSpecific,
  };
}

function mapVoucher(r: any): WastageReturn {
  return {
    id: r.id,
    voucherNumber: r.voucher_number ?? r.voucherNumber ?? '',
    date: r.date ?? '',
    type: r.type ?? 'WASTAGE',
    associatedParty: r.associated_party ?? r.associatedParty,
    partyType: r.party_type ?? r.partyType ?? 'NONE',
    reason: r.reason ?? '',
    status: r.status ?? 'DRAFT',
    location: r.location ?? '',
    recordedBy: r.recorded_by ?? r.recordedBy,
    approvedBy: r.approved_by ?? r.approvedBy,
    totalItems: Number(r.total_items ?? r.totalItems ?? 0),
    totalValue: Number(r.total_value ?? r.totalValue ?? 0),
    notes: r.notes,
    approvalDate: r.approval_date ?? r.approvalDate,
    rejectionReason: r.rejection_reason ?? r.rejectionReason,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt,
    createdBy: r.created_by ?? r.createdBy,
    items: (r.items ?? []).map(mapItem),
  };
}

function mapStats(r: any): WastageReturnStats {
  return {
    totalVouchers: r.total_vouchers ?? r.totalVouchers ?? 0,
    pendingApproval: r.pending_approval ?? r.pendingApproval ?? 0,
    totalWastageValue: Number(r.total_wastage_value ?? r.totalWastageValue ?? 0),
    totalReturnValue: Number(r.total_return_value ?? r.totalReturnValue ?? 0),
    monthlyWastage: Number(r.monthly_wastage ?? r.monthlyWastage ?? 0),
    monthlyReturns: Number(r.monthly_returns ?? r.monthlyReturns ?? 0),
    topWastedProducts: (r.top_wasted_products ?? r.topWastedProducts ?? []).map((p: any) => ({
      name: p.name ?? '',
      value: Number(p.value ?? 0),
      quantity: Number(p.quantity ?? 0),
    })),
    topReturnReasons: (r.top_return_reasons ?? r.topReturnReasons ?? []).map((p: any) => ({
      reason: p.reason ?? '',
      count: Number(p.count ?? 0),
      value: Number(p.value ?? 0),
    })),
  };
}

function toItemBody(item: WastageReturnItemRequest): Record<string, any> {
  return {
    product_id: item.productId,
    product_name: item.productName,
    sku: item.sku,
    batch_no: item.batchNo,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    unit: item.unit,
    reason_specific: item.reasonSpecific,
  };
}

function toVoucherBody(req: WastageReturnRequest): Record<string, any> {
  return {
    date: req.date,
    type: req.type,
    associated_party: req.associatedParty,
    party_type: req.partyType,
    reason: req.reason,
    location: req.location,
    recorded_by: req.recordedBy,
    notes: req.notes,
    items: req.items.map(toItemBody),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class WastageReturnService {

  async getVouchers(filters?: {
    page?: number;
    size?: number;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<WastageReturnPage> {
    const params = new URLSearchParams();
    if (filters?.page)   params.append('page',   String(filters.page));
    if (filters?.size)   params.append('size',   String(filters.size));
    if (filters?.type)   params.append('type',   filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns?${params.toString()}`
    );
    if (!res.ok) throw new Error(`Failed to fetch vouchers: ${res.status}`);
    const raw = await res.json();
    return {
      vouchers: (raw.vouchers ?? raw.content ?? (Array.isArray(raw) ? raw : [])).map(mapVoucher),
      pagination: {
        page: raw.pagination?.page ?? 1,
        size: raw.pagination?.size ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.totalPages ?? raw.pagination?.total_pages ?? raw.totalPages ?? 0,
      },
    };
  }

  async getStats(): Promise<WastageReturnStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wastage-returns/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    return mapStats(await res.json());
  }

  async getById(id: number): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wastage-returns/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch voucher: ${res.status}`);
    return mapVoucher(await res.json());
  }

  async createVoucher(req: WastageReturnRequest): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wastage-returns`, {
      method: 'POST',
      body: JSON.stringify(toVoucherBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to create voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async updateVoucher(id: number, req: WastageReturnRequest): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wastage-returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toVoucherBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to update voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async deleteVoucher(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wastage-returns/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete voucher: ${res.status}`);
  }

  async submitForApproval(id: number): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns/${id}/submit`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to submit voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async approveVoucher(id: number): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns/${id}/approve`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to approve voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async rejectVoucher(id: number, rejectionReason: string): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to reject voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async completeVoucher(id: number): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns/${id}/complete`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to complete voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }

  async cancelVoucher(id: number): Promise<WastageReturn> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/wastage-returns/${id}/cancel`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to cancel voucher: ${res.status}`);
    }
    return mapVoucher(await res.json());
  }
}

export const wastageReturnService = new WastageReturnService();
