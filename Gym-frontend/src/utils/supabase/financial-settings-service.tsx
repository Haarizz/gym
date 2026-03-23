import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface FinancialSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  category: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSettingRequest {
  settingKey: string;
  settingValue: string;
  category: string;
  description?: string;
  isActive?: boolean;
}

function mapSetting(r: any): FinancialSetting {
  return {
    id: r.id,
    settingKey: r.setting_key,
    settingValue: r.setting_value ?? "",
    category: r.category,
    description: r.description ?? null,
    isActive: r.is_active ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

class FinancialSettingsService {
  async getSettings(category?: string): Promise<FinancialSetting[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-settings${query}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch financial settings");
    const data = await res.json();
    return data.map(mapSetting);
  }

  async upsertSetting(req: FinancialSettingRequest): Promise<FinancialSetting> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/financial-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setting_key: req.settingKey,
        setting_value: req.settingValue,
        category: req.category,
        description: req.description ?? null,
        is_active: req.isActive ?? true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to save setting");
    }
    return mapSetting(await res.json());
  }

  async deleteSetting(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-settings/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete setting");
  }
}

export const financialSettingsService = new FinancialSettingsService();
