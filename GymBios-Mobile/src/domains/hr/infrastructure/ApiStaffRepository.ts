import type {
  CreateStaffRequest,
  StaffFilters,
  StaffRepository,
  UpdateStaffRequest,
} from '../application/StaffRepository';
import type { Staff, StaffPage } from '../domain/Staff';

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
}