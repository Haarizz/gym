import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string;
  salary: number;
  certifications: string[];
  schedule: 'full_time' | 'part_time' | 'contract';
  created_at: string;
  updated_at: string;
}

export interface StaffFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
}

class StaffService {

  async getStaff(filters: StaffFilters = {}): Promise<Staff[]> {
    const params = new URLSearchParams();
    if (filters.search)     params.append('search',     filters.search);
    if (filters.role)       params.append('role',       filters.role);
    if (filters.department) params.append('department', filters.department);
    if (filters.status)     params.append('status',     filters.status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch staff: ${response.status}`);
    return response.json();
  }

  async getStaffById(id: string): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch staff member: ${response.status}`);
    return response.json();
  }

  async createStaff(data: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create staff member: ${response.status}`);
    return response.json();
  }

  async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to update staff member: ${response.status}`);
    return response.json();
  }

  async deleteStaff(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete staff member: ${response.status}`);
  }

  async getDepartments(): Promise<string[]> {
    const staff = await this.getStaff();
    return [...new Set(staff.map(s => s.department))].sort();
  }

  async getRoles(): Promise<string[]> {
    const staff = await this.getStaff();
    return [...new Set(staff.map(s => s.role))].sort();
  }

  async getStaffStats() {
    const staff = await this.getStaff();
    return {
      total:        staff.length,
      active:       staff.filter(s => s.status === 'active').length,
      onLeave:      staff.filter(s => s.status === 'on_leave').length,
      byDepartment: staff.reduce((acc, s) => { acc[s.department] = (acc[s.department] || 0) + 1; return acc; }, {} as Record<string, number>),
      byRole:       staff.reduce((acc, s) => { acc[s.role]       = (acc[s.role]       || 0) + 1; return acc; }, {} as Record<string, number>),
    };
  }
}

export const staffService = new StaffService();
