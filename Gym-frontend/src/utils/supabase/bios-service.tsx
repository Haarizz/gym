import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BiosSettings {
  monthly_revenue_target?: number | null;
  daily_checkin_target_percent?: number | null;
  alert_enabled: boolean;
  alert_email?: string | null;
  alert_retention_threshold?: number | null;
  schedule_enabled: boolean;
  schedule_email?: string | null;
  schedule_frequency?: string | null;
  revenue_alert_enabled?: boolean;
  revenue_alert_threshold_percent?: number | null;
  benchmark_revenue_per_member?: number | null;
  benchmark_retention_percent?: number | null;
  benchmark_class_utilization_percent?: number | null;
  benchmark_staff_efficiency_percent?: number | null;
  benchmark_operating_margin_percent?: number | null;
}

export interface BiosActivityLogEntry {
  id: string;
  type: 'REPORT' | 'EXPORT';
  title: string;
  format: string;
  row_count?: number | null;
  generated_by?: string | null;
  created_at?: string | null;
}

export interface BiosBranchComparisonRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_members: number;
  active_members: number;
  retention_percent: number;
  month_revenue: number;
}

class BiosService {
  async getSettings(): Promise<BiosSettings> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/settings`);
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch BiOS settings: ${response.status}`));
    return response.json();
  }

  async updateSettings(settings: Partial<BiosSettings>): Promise<BiosSettings> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to update BiOS settings: ${response.status}`));
    return response.json();
  }

  /** Logs a generated report/export so "Recent Reports"/"Recent Exports" reflect real activity. */
  async logActivity(type: 'REPORT' | 'EXPORT', title: string, format: string, rowCount: number): Promise<BiosActivityLogEntry> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/activity`, {
      method: 'POST',
      body: JSON.stringify({ type, title, format, row_count: rowCount })
    });
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to log BiOS activity: ${response.status}`));
    return response.json();
  }

  async getRecentActivity(type: 'REPORT' | 'EXPORT', limit = 10): Promise<BiosActivityLogEntry[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/activity?type=${type}&limit=${limit}`);
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch BiOS activity: ${response.status}`));
    return response.json();
  }

  /** Only meaningful while viewing "All Branches" — see BiosController for why. */
  async getBranchComparison(): Promise<BiosBranchComparisonRow[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/branch-comparison`);
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch branch comparison: ${response.status}`));
    return response.json();
  }
}

export const biosService = new BiosService();
