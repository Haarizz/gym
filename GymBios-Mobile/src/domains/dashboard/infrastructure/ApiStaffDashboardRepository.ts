import { apiClient } from '@/core/network/apiClient';
import type { StaffDashboardData } from '../domain/StaffDashboardData';

export class ApiStaffDashboardRepository {
  /**
   * GET /api/mobile/staff/dashboard
   * Fetches the scoped staff dashboard dataset from the backend.
   */
  async getStaffDashboard(): Promise<StaffDashboardData> {
    const response = await apiClient.get<StaffDashboardData>('/mobile/staff/dashboard');
    return response.data;
  }
}

export const staffDashboardRepository = new ApiStaffDashboardRepository();
