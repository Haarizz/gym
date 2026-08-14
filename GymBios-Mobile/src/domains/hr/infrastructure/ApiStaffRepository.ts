import type {
  CreateStaffRequest,
  StaffFilters,
  StaffRepository,
  UpdateStaffRequest,
} from '../application/StaffRepository';
import type { Staff, StaffPage } from '../domain/Staff';
import type { StaffTarget, StaffTargetFilters } from '../domain/StaffTarget';

import { apiClient } from '@/core/network/apiClient';

interface StaffResponse {
  id: string;
  staff_id: string;

  name: string;
  email: string;
  phone: string;

  role: string;
  department: string;
  branch: string;

  monthly_target: number | null;
  base_salary: number | null;

  status: string;
  join_date: string;

  address: string;
  photo_url?: string | null;

  certifications: Staff['certifications'];
  schedule: Staff['schedule'];

  created_at?: string;
  updated_at?: string;

  user_id?: number | null;
  app_username?: string | null;
  app_access_enabled?: boolean | null;
}

interface StaffPageResponse {
  items: StaffResponse[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface StaffTargetResponse {
  id: string;
  staff_db_id?: string;
  staff_id?: string;
  staff_name?: string;
  staff_role?: string;
  staff_department?: string;
  scope?: string;
  timeframe?: string;
  year?: number;
  month?: number;
  start_date?: string;
  end_date?: string;
  revenue_target?: number;
  revenue_achieved?: number;
  percentage?: number;
  sessions_target?: number;
  sessions_achieved?: number;
  new_clients_target?: number;
  new_clients_achieved?: number;
  unit_targets_json?: string;
  commission_earned?: number;
  trend?: string;
  forecast?: number;
}

export class ApiStaffRepository implements StaffRepository {
  async getStaff(filters?: StaffFilters): Promise<StaffPage> {
    const response = await apiClient.get<StaffPageResponse>(
      '/staff',
      {
        params: filters,
      },
    );

    return {
      content: response.data.items.map(item =>
        this.toDomain(item),
      ),
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalElements: response.data.pagination.total,
      totalPages: response.data.pagination.total_pages,
    };
  }

  async getStaffById(id: string): Promise<Staff> {
    const response = await apiClient.get<StaffResponse>(`/staff/${id}`);

    return this.toDomain(response.data);
  }

  async createStaff(request: CreateStaffRequest): Promise<Staff> {
    const response = await apiClient.post<StaffResponse>('/staff', request);

    return this.toDomain(response.data);
  }

  async updateStaff(
    id: string,
    request: UpdateStaffRequest,
  ): Promise<Staff> {
    const response = await apiClient.put<StaffResponse>(
      `/staff/${id}`,
      request,
    );

    return this.toDomain(response.data);
  }

  async deleteStaff(id: string): Promise<void> {
    await apiClient.delete(`/staff/${id}`);
  }

  async getTargets(filters?: StaffTargetFilters): Promise<StaffTarget[]> {
    const params: Record<string, string | number | undefined> = {};
    if (filters?.year) params.year = filters.year;
    if (filters?.month) params.month = filters.month;
    if (filters?.scope) params.scope = filters.scope;
    if (filters?.staffDbId) params.staff_db_id = filters.staffDbId;

    const response = await apiClient.get<StaffTargetResponse[]>(
      '/staff-targets',
      { params },
    );

    return (response.data ?? []).map(item => this.toStaffTargetDomain(item));
  }

  private toDomain(response: StaffResponse): Staff {
    return {
      id: response.id,
      staffId: response.staff_id,

      name: response.name,
      email: response.email,
      phone: response.phone,

      role: response.role,
      department: response.department,
      branch: response.branch,

      monthlyTarget: response.monthly_target ?? 0,
      baseSalary: response.base_salary ?? 0,

      status: response.status,
      joinDate: response.join_date,

      address: response.address,
      photoUrl: response.photo_url ?? undefined,

      certifications: response.certifications,
      schedule: response.schedule,

      createdAt: response.created_at,
      updatedAt: response.updated_at,

      userId: response.user_id ?? undefined,
      appUsername: response.app_username ?? undefined,
      appAccessEnabled: response.app_access_enabled ?? false,
    };
  }

  private toStaffTargetDomain(response: StaffTargetResponse): StaffTarget {
    return {
      id: String(response.id),
      staffDbId: response.staff_db_id,
      staffId: response.staff_id,
      staffName: response.staff_name,
      staffRole: response.staff_role,
      staffDepartment: response.staff_department,
      scope: response.scope ?? 'individual',
      timeframe: response.timeframe,
      year: response.year,
      month: response.month,
      startDate: response.start_date,
      endDate: response.end_date,
      revenueTarget: response.revenue_target ?? 0,
      revenueAchieved: response.revenue_achieved ?? 0,
      percentage: response.percentage ?? 0,
      sessionsTarget: response.sessions_target,
      sessionsAchieved: response.sessions_achieved,
      newClientsTarget: response.new_clients_target,
      newClientsAchieved: response.new_clients_achieved,
      unitTargetsJson: response.unit_targets_json,
      commissionEarned: response.commission_earned,
      trend: response.trend,
      forecast: response.forecast,
    };
  }
}