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
  // App authentication fields
  user_id?: number;
  app_username?: string;
  app_access_enabled?: boolean;
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
  app_username?: string;
  app_password?: string;
  enable_login?: boolean;
  // Security role for the linked login account (Admin/Receptionist/Trainer/Accountant/Manager) —
  // independent of `role` (job title, used for commission/target filtering).
  app_role?: string;
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
  // Rate applied to new-member admission revenue instead of base_commission,
  // which still applies to everything else (renewals, add-ons, walk-ins).
  // Falls back to base_commission when not set.
  admission_commission?: number;
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

  /** Returns the staff record linked to the currently logged-in account, or null if none. */
  async getMyProfile(): Promise<Staff | null> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/me`
    );
    if (response.status === 404 || response.status === 401) return null;
    if (!response.ok) throw new Error(`Failed to fetch my profile: ${response.status}`);
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

  async setStaffCredentials(id: string, appUsername: string, appPassword: string, appRole?: string): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/${id}/set-credentials`,
      { method: 'POST', body: JSON.stringify({ appUsername, appPassword, appRole }) }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any) || `Failed to set credentials: ${response.status}`);
    }
    return response.json();
  }

  async toggleStaffAccess(id: string, enabled: boolean): Promise<Staff> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff/${id}/toggle-access`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) }
    );
    if (!response.ok) throw new Error(`Failed to toggle staff access: ${response.status}`);
    return response.json();
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

  /** Targets for the staff member linked to the logged-in account, defaulting to the current month. */
  async getMyTargets(year?: number, month?: number): Promise<StaffTarget[]> {
    const params = new URLSearchParams();
    if (year)  params.append('year',  String(year));
    if (month) params.append('month', String(month));

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/staff-targets/me?${params.toString()}`
    );
    if (response.status === 404 || response.status === 401) return [];
    if (!response.ok) throw new Error(`Failed to fetch my targets: ${response.status}`);
    return response.json();
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
    admission_commission?: number;
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
    admission_commission?: number;
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
