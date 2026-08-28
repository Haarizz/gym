import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface MemberAddon {
  id: string;
  transaction_id: string;
  member_db_id: string;
  member_id: string;
  member_name: string;
  addon_name: string;
  addon_description?: string;
  category: string;
  amount: number;
  payment_mode: string;
  start_date: string;
  expiry_date: string;
  purchase_date: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AddonsResponse {
  addons: MemberAddon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAddonRequest {
  member_db_id: number;
  member_id: string;
  member_name: string;
  addon_name: string;
  addon_description?: string;
  category: string;
  amount: number;
  payment_mode: string;
  start_date: string;
  expiry_date: string;
  notes?: string;
  payment_breakdown?: Record<string, any>[];
  // Only meaningful when the member is billed to a family head (any minor,
  // or a billed_to_head adult): how much is being collected now, out of
  // `amount` — the remainder becomes a due on the family head's account.
  paid_amount?: number;
  // How much of `amount` is covered by the member's reward wallet balance, if
  // any — debited server-side in the same transaction as the add-on itself.
  wallet_amount_applied?: number;
  // Which staff member actually handled this sale — credited toward their
  // revenue target regardless of which account is logged in.
  processed_by_staff_id?: number;
}

class AddonsService {
  async getAddons(
    filters: { search?: string; status?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<AddonsResponse> {
    const params = new URLSearchParams();
    if (pagination.page)   params.append('page',   String(pagination.page));
    if (pagination.limit)  params.append('limit',  String(pagination.limit));
    if (filters.search)    params.append('search', filters.search);
    if (filters.status)    params.append('status', filters.status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch addons: ${response.status}`);
    return response.json();
  }

  async createAddon(data: CreateAddonRequest): Promise<MemberAddon> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create addon: ${response.status}`);
    }
    return response.json();
  }

  async updateAddonStatus(id: string, status: string): Promise<MemberAddon> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}/status?status=${encodeURIComponent(status)}`,
      { method: 'PUT' }
    );
    if (!response.ok) throw new Error(`Failed to update addon status: ${response.status}`);
    return response.json();
  }

  async deleteAddon(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete addon: ${response.status}`);
  }
}

export const addonsService = new AddonsService();
