import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface CostCenter {
  id: number;
  code: string;
  name: string;
  branch: string | null;
  manager: string | null;
  description: string | null;
  budget: number;
  spent: number;
  utilization: number;
  isActive: boolean;
  linkedAccounts: number;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenterCreateRequest {
  code?: string;
  name: string;
  branch?: string;
  manager?: string;
  description?: string;
  budget?: number;
  isActive?: boolean;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  type: string;
  referenceNo: string;
  description: string | null;
  debit: number;
  credit: number;
  branch: string | null;
  status: string | null;
  costCenter: string | null;
}

export interface AccountHead {
  id: number;
  code: string;
  name: string;
  type: string;
  subGroup: string | null;
  parentId: number | null;
  level: number | null;
  branch: string | null;
  costCenter: string | null;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountHeadCreateRequest {
  code: string;
  name: string;
  type: string;
  subGroup?: string;
  parentId?: number | null;
  level?: number;
  branch?: string;
  costCenter?: string;
  openingBalance?: number;
  isActive?: boolean;
  description?: string;
}

export interface LedgerEntry {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId: number;
  accountCode?: string;
  accountName?: string;
}

function mapAccountHead(r: any): AccountHead {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    subGroup: r.sub_group ?? null,
    parentId: r.parent_id ?? null,
    level: r.level ?? null,
    branch: r.branch ?? null,
    costCenter: r.cost_center ?? null,
    openingBalance: r.opening_balance ?? 0,
    currentBalance: r.current_balance ?? 0,
    isActive: r.is_active ?? true,
    description: r.description ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapLedgerEntry(r: any): LedgerEntry {
  return {
    date: r.date,
    reference: r.reference,
    description: r.description,
    debit: r.debit ?? 0,
    credit: r.credit ?? 0,
    balance: r.balance ?? 0,
    sourceType: r.source_type,
    sourceId: r.source_id,
    accountCode: r.account_code ?? undefined,
    accountName: r.account_name ?? undefined,
  };
}

function toAccountHeadBody(req: AccountHeadCreateRequest): any {
  return {
    code: req.code,
    name: req.name,
    type: req.type,
    sub_group: req.subGroup ?? null,
    parent_id: req.parentId ?? null,
    level: req.level ?? null,
    branch: req.branch ?? null,
    cost_center: req.costCenter ?? null,
    opening_balance: req.openingBalance ?? 0,
    is_active: req.isActive ?? true,
    description: req.description ?? null,
  };
}

class LedgersService {
  async getAccountHeads(params?: {
    type?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<AccountHead[]> {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    if (params?.isActive !== undefined)
      query.set("is_active", String(params.isActive));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch account heads");
    const data = await res.json();
    return data.map(mapAccountHead);
  }

  async getAllLedgerEntries(from?: string, to?: string): Promise<LedgerEntry[]> {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads/ledger${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch all ledger entries");
    const data = await res.json();
    return data.map(mapLedgerEntry);
  }

  async getLedgerEntries(
    code: string,
    from?: string,
    to?: string
  ): Promise<LedgerEntry[]> {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads/${code}/ledger${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch ledger entries");
    const data = await res.json();
    return data.map(mapLedgerEntry);
  }

  async createAccountHead(req: AccountHeadCreateRequest): Promise<AccountHead> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/account-heads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toAccountHeadBody(req)),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to create account head");
    }
    return mapAccountHead(await res.json());
  }

  async updateAccountHead(
    id: number,
    req: AccountHeadCreateRequest
  ): Promise<AccountHead> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAccountHeadBody(req)),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to update account head");
    }
    return mapAccountHead(await res.json());
  }

  async toggleActive(id: number): Promise<AccountHead> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads/${id}/toggle-active`,
      { method: "PATCH" }
    );
    if (!res.ok) throw new Error("Failed to toggle active status");
    return mapAccountHead(await res.json());
  }

  async deleteAccountHead(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete account head");
  }

  async getCostCenters(params?: {
    branch?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<CostCenter[]> {
    const query = new URLSearchParams();
    if (params?.branch) query.set("branch", params.branch);
    if (params?.isActive !== undefined)
      query.set("is_active", String(params.isActive));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/cost-centers${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch cost centers");
    const data = await res.json();
    return data.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      branch: r.branch ?? null,
      manager: r.manager ?? null,
      description: r.description ?? null,
      budget: r.budget ?? 0,
      spent: r.spent ?? 0,
      utilization: r.utilization ?? 0,
      isActive: r.is_active ?? true,
      linkedAccounts: r.linked_accounts ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createCostCenter(req: CostCenterCreateRequest): Promise<CostCenter> {
    const body: any = {
      name: req.name,
      branch: req.branch ?? null,
      manager: req.manager ?? null,
      description: req.description ?? null,
      budget: req.budget ?? null,
      is_active: req.isActive ?? true,
    };
    if (req.code) body.code = req.code;
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/cost-centers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to create cost center");
    }
    const r = await res.json();
    return {
      id: r.id, code: r.code, name: r.name, branch: r.branch ?? null,
      manager: r.manager ?? null, description: r.description ?? null,
      budget: r.budget ?? 0, spent: r.spent ?? 0, utilization: r.utilization ?? 0,
      isActive: r.is_active ?? true, linkedAccounts: r.linked_accounts ?? 0,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  async updateCostCenter(id: number, req: CostCenterCreateRequest): Promise<CostCenter> {
    const body: any = {
      name: req.name,
      branch: req.branch ?? null,
      manager: req.manager ?? null,
      description: req.description ?? null,
      budget: req.budget ?? null,
      is_active: req.isActive ?? true,
    };
    if (req.code) body.code = req.code;
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/cost-centers/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to update cost center");
    }
    const r = await res.json();
    return {
      id: r.id, code: r.code, name: r.name, branch: r.branch ?? null,
      manager: r.manager ?? null, description: r.description ?? null,
      budget: r.budget ?? 0, spent: r.spent ?? 0, utilization: r.utilization ?? 0,
      isActive: r.is_active ?? true, linkedAccounts: r.linked_accounts ?? 0,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  async toggleCostCenterActive(id: number): Promise<CostCenter> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/cost-centers/${id}/toggle-active`,
      { method: "PATCH" }
    );
    if (!res.ok) throw new Error("Failed to toggle cost center active status");
    const r = await res.json();
    return {
      id: r.id, code: r.code, name: r.name, branch: r.branch ?? null,
      manager: r.manager ?? null, description: r.description ?? null,
      budget: r.budget ?? 0, spent: r.spent ?? 0, utilization: r.utilization ?? 0,
      isActive: r.is_active ?? true, linkedAccounts: r.linked_accounts ?? 0,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  async deleteCostCenter(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/cost-centers/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete cost center");
  }

  async getTransactions(params?: {
    from?: string;
    to?: string;
    type?: string;
    search?: string;
  }): Promise<LedgerTransaction[]> {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/ledger-transactions${qs ? "?" + qs : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch ledger transactions");
    const data = await res.json();
    return data.map((r: any) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      referenceNo: r.reference_no,
      description: r.description ?? null,
      debit: r.debit ?? 0,
      credit: r.credit ?? 0,
      branch: r.branch ?? null,
      status: r.status ?? null,
      costCenter: r.cost_center ?? null,
    }));
  }
}

export const ledgersService = new LedgersService();
