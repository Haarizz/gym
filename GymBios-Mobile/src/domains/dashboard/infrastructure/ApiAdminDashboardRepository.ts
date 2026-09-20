import { apiClient } from '@/core/network/apiClient';
import type {
  AdminDashboardReportResponseApi,
  AdminDashboardResponseApi,
} from './AdminDashboardApiModels';

export interface AdminDashboardDateParams {
  from?: string; // ISO yyyy-MM-dd
  to?: string; // ISO yyyy-MM-dd
}

export class ApiAdminDashboardRepository {
  /**
   * GET /api/mobile/admin/dashboard
   * Branch scope is carried by the shared X-Active-Branch-Id header (set by
   * BranchProvider / setApiClientBranch) — not passed as a query param here,
   * matching how every other mobile dashboard endpoint is scoped.
   */
  async getAdminDashboard(params: AdminDashboardDateParams): Promise<AdminDashboardResponseApi> {
    const response = await apiClient.get<AdminDashboardResponseApi>('/mobile/admin/dashboard', {
      params,
    });
    return response.data;
  }

  /**
   * GET /api/mobile/admin/dashboard/report
   * Inherits the same branch scope; date range must be passed explicitly so a
   * report opened from a KPI card always matches the dashboard's current filters.
   */
  async getAdminReport(
    reportType: string,
    params: AdminDashboardDateParams & { page?: number; size?: number },
  ): Promise<AdminDashboardReportResponseApi> {
    const response = await apiClient.get<AdminDashboardReportResponseApi>(
      '/mobile/admin/dashboard/report',
      { params: { type: reportType, ...params } },
    );
    return response.data;
  }
}

export const adminDashboardRepository = new ApiAdminDashboardRepository();
