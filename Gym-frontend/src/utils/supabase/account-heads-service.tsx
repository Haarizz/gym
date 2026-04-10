import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AccountHead {
  id: number;
  code: string;
  name: string;
  type: string;
  subGroup: string | null;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
}

function mapAccountHead(r: any): AccountHead {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    subGroup: r.subGroup ?? null,
    openingBalance: r.openingBalance ?? 0,
    currentBalance: r.currentBalance ?? 0,
    isActive: r.isActive ?? true,
  };
}

class AccountHeadsService {
  async getAll(type?: string, isActive?: boolean): Promise<AccountHead[]> {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (isActive !== undefined) params.set("is_active", String(isActive));
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/account-heads${query}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch account heads");
    const data = await res.json();
    return data.map(mapAccountHead);
  }

  async getBankAccounts(): Promise<AccountHead[]> {
    const assets = await this.getAll("ASSET", true);
    return assets.filter(a => {
      const upper = a.name.toUpperCase();
      return upper.includes("CASH") || upper.includes("BANK");
    });
  }
}

export const accountHeadsService = new AccountHeadsService();
