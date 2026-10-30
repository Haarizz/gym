import { authService } from './auth-service';
import type { Receipt } from './receipts-service';

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
  /** Only on the createAddon response — the receipt the purchase generated. */
  receipt?: Receipt;
  /** What an app purchase took from the member's wallet. */
  wallet_amount?: number | null;
  /** What went back to the wallet when it was cancelled. */
  refunded_amount?: number | null;
  /** Only on the pending-approvals list: received so far (wallet included) and the promo code. */
  paid_amount?: number | null;
  discount_amount?: number | null;
  discount_label?: string | null;
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

  async getAddonReceipt(id: string): Promise<Receipt> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}/receipt`
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch receipt: ${response.status}`);
    }
    return response.json();
  }

  /** Cancelling refunds what was paid to the member's wallet. */
  async updateAddonStatus(id: string, status: string): Promise<MemberAddon> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}/status?status=${encodeURIComponent(status)}`,
      { method: 'PUT' }
    );
    if (!response.ok) throw new Error(await this.errorMessage(response, `Failed to update addon status: ${response.status}`));
    return response.json();
  }

  /** Add-ons bought in the app with Cash/Credit/Mixed, awaiting reception approval. */
  async getPendingPaymentApprovals(): Promise<MemberAddon[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/member-addons/pending-approvals`);
    if (!response.ok) throw new Error(await this.errorMessage(response, `Failed to fetch add-on approvals: ${response.status}`));
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /** Activates the add-on and posts the payment to the ledger. */
  async approvePayment(id: string): Promise<MemberAddon> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}/approve-payment`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    if (!response.ok) throw new Error(await this.errorMessage(response, `Failed to approve payment: ${response.status}`));
    return response.json();
  }

  /** The add-on never starts; any wallet amount is returned. */
  async rejectPayment(id: string, reason: string): Promise<MemberAddon> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/member-addons/${id}/reject-payment`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    if (!response.ok) throw new Error(await this.errorMessage(response, `Failed to reject payment: ${response.status}`));
    return response.json();
  }

  private async errorMessage(response: Response, fallback: string): Promise<string> {
    const text = await response.text().catch(() => '');
    try {
      const body = JSON.parse(text);
      return body.message || body.error || fallback;
    } catch {
      return text || fallback;
    }
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
