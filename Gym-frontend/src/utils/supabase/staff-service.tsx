import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface StaffCertification {
  id?: string;
  cert_name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  document_url?: string;
}

export interface Staff {
  id: string;
  staff_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
  monthly_target: number;
  base_salary?: number;
  status: 'active' | 'inactive' | 'on_leave';
  join_date: string;
  address: string;
  photo_url?: string;
  certifications: StaffCertification[];
  schedule: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface StaffRequestData {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
  monthly_target: number;
  base_salary?: number;
  status: string;
  join_date: string;
  address: string;
  photo_url?: string;
  certifications: Array<{
    cert_name: string;
    issuer: string;
    issue_date: string;
    expiry_date: string;
    document_url?: string;
  }>;
  schedule: Record<string, string[]>;
}

export interface StaffFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  branch?: string;
}

export interface StaffPageResponse {
  items: Staff[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export interface StaffTarget {
  id: string;
  staff_db_id: string;
  staff_id: string;
  staff_name: string;
  staff_role: string;
  staff_department: string;
  scope: string;
  timeframe: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  revenue_target: number;
  revenue_achieved: number;
  percentage: number;
  sessions_target: number;
  sessions_achieved: number;
  new_clients_target: number;
  new_clients_achieved: number;
  unit_targets_json: string;
  commission_earned: number;
  trend: string;
  forecast: number;
}

export interface CommissionRule {
  id: string;
  role: string;
  base_commission: number;
  target_bonuses_json: string;
}

class StaffService {

  // ── Staff CRUD ──────────────────────────────────────────────────────────

  async getStaff(filters: StaffFilters = {}, page = 1, limit = 50): Promise<StaffPageResponse> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filters.search)     params.append('search',     filters.search);
    if (filters.role)       params.append('role',       filters.role);
    if (filters.department) params.append('department', filters.department);
    if (filters.status)     params.append('status',     filters.status);
    if (filters.branch)     params.append('branch',     filters.branch);

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

  async createStaff(data: StaffRequestData): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create staff member: ${response.status}`);
    return response.json();
  }

  async updateStaff(id: string, data: Partial<StaffRequestData>): Promise<Staff> {
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

  // ── Staff Targets ────────────────────────────────────────────────────────

  async getTargets(year?: number, month?: number, scope?: string, staffDbId?: number): Promise<StaffTarget[]> {
    const params = new URLSearchParams();
    if (year)       params.append('year',         String(year));
    if (month)      params.append('month',        String(month));
    if (scope)      params.append('scope',        scope);
    if (staffDbId)  params.append('staff_db_id',  String(staffDbId));

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff-targets?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch targets: ${response.status}`);
    return response.json();
  }

  async createTarget(data: {
    staff_db_id?: number;
    scope: string;
    timeframe: string;
    year?: number;
    month?: number;
    start_date?: string;
    end_date?: string;
    revenue_target: number;
    sessions_target?: number;
    new_clients_target?: number;
    unit_targets_json?: string;
  }): Promise<StaffTarget> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff-targets`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create target: ${response.status}`);
    return response.json();
  }

  async updateTarget(id: string, data: Partial<StaffTarget>): Promise<StaffTarget> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff-targets/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to update target: ${response.status}`);
    return response.json();
  }

  async deleteTarget(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff-targets/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete target: ${response.status}`);
  }

  // ── Commission Rules ─────────────────────────────────────────────────────

  async getCommissionRules(): Promise<CommissionRule[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/commission-rules`
    );
    if (!response.ok) throw new Error(`Failed to fetch commission rules: ${response.status}`);
    return response.json();
  }

  async updateCommissionRule(id: string, data: {
    role?: string;
    base_commission?: number;
    target_bonuses_json?: string;
  }): Promise<CommissionRule> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/commission-rules/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to update commission rule: ${response.status}`);
    return response.json();
  }

  async createCommissionRule(data: {
    role: string;
    base_commission: number;
    target_bonuses_json: string;
  }): Promise<CommissionRule> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/commission-rules`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create commission rule: ${response.status}`);
    return response.json();
  }
}

export const staffService = new StaffService();
