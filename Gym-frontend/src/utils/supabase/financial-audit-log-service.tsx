import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface FinancialAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  voucherNo?: string;
  module?: string;
  performedBy?: string;
  ipAddress?: string;
  summary?: string;
  createdAt: string;
}

function mapLog(r: any): FinancialAuditLog {
  return {
    id: String(r.id),
    action: r.action ?? "",
    entityType: r.entity_type ?? r.entityType ?? "",
    entityId: String(r.entity_id ?? r.entityId ?? ""),
    voucherNo: r.voucher_no ?? r.voucherNo,
    module: r.module,
    performedBy: r.performed_by ?? r.performedBy,
    ipAddress: r.ip_address ?? r.ipAddress,
    summary: r.summary,
    createdAt: r.created_at ?? r.createdAt ?? "",
  };
}

class FinancialAuditLogService {
  async search(filters: {
    entityType?: string;
    entityId?: string;
    module?: string;
    from?: string;
    to?: string;
  } = {}): Promise<FinancialAuditLog[]> {
    const params = new URLSearchParams();
    if (filters.entityType) params.append("entity_type", filters.entityType);
    if (filters.entityId) params.append("entity_id", filters.entityId);
    if (filters.module) params.append("module", filters.module);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-audit-logs?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to load financial audit log");
    const data = await res.json();
    return (data ?? []).map(mapLog);
  }
}

export const financialAuditLogService = new FinancialAuditLogService();
