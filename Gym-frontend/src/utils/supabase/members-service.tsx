import { authService } from './auth-service';
import { PaymentSplitLeg } from './billing-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membership_type: string;
  membership_status: 'active' | 'inactive' | 'suspended' | 'expired' | 'frozen';
  join_date: string;
  expiry_date?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  payment_status: 'paid' | 'overdue' | 'pending';
  monthly_fee: number;
  created_at: string;
  updated_at: string;
  member_id?: string;
  membership_plan?: string;
  membership_start_date?: string;
  membership_end_date?: string;
  membership_fee?: number;
  total_visits?: number;
  photo_url?: string;
  date_of_birth?: string;
  blood_type?: string;
  medical_conditions?: string;
  allergies?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_notes?: string;
  freeze_start_date?: string;
  freeze_end_date?: string;
  freeze_reason?: string;
  outstanding_balance?: number;
  last_payment_date?: string;
  next_payment_date?: string;
  payment_method?: string;
  // The backend's MemberResponseDTO actually serializes this field as
  // payment_method_used (Member.paymentMethodUsed) — payment_method above
  // is never populated by GET /members/{id}; kept for other existing callers.
  payment_method_used?: string;
  discount_applied?: number;
  reg_doc_number?: string;
  reg_doc_date?: string;
  address?: string;
  nationality?: string;
  gender?: string;
  height?: number;
  weight?: number;
  chronic_illnesses?: string;
  is_family_head?: boolean;
  family_head_id?: string;
  family_head_name?: string;
  relationship_to_head?: string;
  is_minor?: boolean;
  // True when this member's charges/renewals are folded into the family head's
  // single invoice — always true for is_minor, also true for an adult dependent
  // under a family_head-billing-mode Family plan.
  billed_to_head?: boolean;
  // App authentication fields
  user_id?: number;
  app_username?: string;
  app_access_enabled?: boolean;
}

// One row in the Add Member "Family Members" section, or the payload for
// POST /members/{headId}/family-members. Adults get an independent membership
// (own plan/fee/payment); minors are billed to the family head via minor_fee.
export interface FamilyMemberInput {
  name: string;
  relationship: string;
  is_minor: boolean;
  date_of_birth?: string;
  // Adult-only
  email?: string;
  phone?: string;
  membership_plan?: string;
  membership_fee?: number;
  payment_status?: string;
  outstanding_balance?: number;
  payment_method?: string;
  payment_breakdown?: PaymentSplitLeg[];
  bank_account_code?: string;
  bank_account_name?: string;
  // Minor-only: amount added to the guardian's invoice, and however much of it
  // (if any) was collected now — that portion never becomes the guardian's due.
  minor_fee?: number;
  minor_paid_amount?: number;
  minor_payment_method?: string;
  minor_payment_breakdown?: PaymentSplitLeg[];
  minor_bank_account_code?: string;
  minor_bank_account_name?: string;
}

export interface FamilyGroup {
  head: Member;
  members: Member[];
}

export interface MemberFilters {
  search?: string;
  status?: string;
  membership_type?: string;
  payment_status?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface MembersResponse {
  members: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Mirrors the backend's MemberNoteResponseDTO (global Jackson SNAKE_CASE strategy).
export interface MemberNote {
  id: number;
  member_id: number;
  content: string;
  created_by?: string | null;
  created_at: string;
}

class MembersService {

  async getMembers(filters: MemberFilters = {}, pagination: PaginationParams = {}): Promise<MembersResponse> {
    const params = new URLSearchParams();
    if (pagination.page)          params.append('page',            String(pagination.page));
    if (pagination.limit)         params.append('limit',           String(pagination.limit));
    if (filters.search)           params.append('search',          filters.search);
    if (filters.status)           params.append('status',          filters.status);
    if (filters.membership_type)  params.append('membership_type', filters.membership_type);
    if (filters.payment_status)   params.append('payment_status',  filters.payment_status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members?${params.toString()}`
    );

    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch members: ${response.status}`));
    return response.json();
  }

  async getMemberById(id: string): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch member: ${response.status}`));
    return response.json();
  }

  async createMember(data: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to create member: ${response.status}`));
    return response.json();
  }

  async updateMember(id: string, data: Partial<Member>): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to update member: ${response.status}`));
    return response.json();
  }

  async deleteMember(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to delete member: ${response.status}`));
  }

  async setMemberCredentials(id: string, appUsername: string, appPassword: string): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/set-credentials`,
      { method: 'POST', body: JSON.stringify({ appUsername, appPassword }) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to set credentials: ${response.status}`));
    return response.json();
  }

  async toggleMemberAccess(id: string, enabled: boolean): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/toggle-access`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to toggle member access: ${response.status}`));
    return response.json();
  }

  async renewMember(id: string, data: {
    plan_name: string;
    membership_end_date: string;
    membership_fee: number;
    payment_status: string;
    membership_type?: string;
    membership_status?: string;
    amount_received?: number;
    payment_method?: string;
    payment_breakdown?: PaymentSplitLeg[];
    bank_account_code?: string;
    bank_account_name?: string;
  }): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/renew`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to renew member: ${response.status}`));
    return response.json();
  }

  async freezeMember(id: string, data: { freezeUntil: string; reason?: string }): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/freeze`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to freeze member: ${response.status}`));
    return response.json();
  }

  async renewFamilyMinor(id: string, data: {
    plan_name?: string;
    fee?: number;
    payment_status: string;
    paid_amount?: number;
    payment_method?: string;
    payment_breakdown?: PaymentSplitLeg[];
    bank_account_code?: string;
    bank_account_name?: string;
  }): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/renew-minor`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to renew family member: ${response.status}`));
    return response.json();
  }

  async renewFamily(headId: string, data: {
    plan_name?: string;
    payment_status: string;
    payment_method?: string;
    payment_breakdown?: PaymentSplitLeg[];
    bank_account_code?: string;
    bank_account_name?: string;
  }): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${headId}/renew-family`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to renew family: ${response.status}`));
    return response.json();
  }

  async getFamilyGroup(id: string): Promise<FamilyGroup> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/family`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch family group: ${response.status}`));
    return response.json();
  }

  async addFamilyMember(headId: string, data: FamilyMemberInput): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${headId}/family-members`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to add family member: ${response.status}`));
    return response.json();
  }

  async unfreezeMember(id: string): Promise<Member> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${id}/unfreeze`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to unfreeze member: ${response.status}`));
    return response.json();
  }

  async searchMembers(query: string): Promise<Member[]> {
    if (!query.trim()) return [];
    const result = await this.getMembers({ search: query }, { limit: 10 });
    return result.members;
  }

  async getNotes(memberDbId: string | number): Promise<MemberNote[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${memberDbId}/notes`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch notes: ${response.status}`));
    return response.json();
  }

  async addNote(memberDbId: string | number, content: string): Promise<MemberNote> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/members/${memberDbId}/notes`,
      { method: 'POST', body: JSON.stringify({ content }) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to add note: ${response.status}`));
    return response.json();
  }

  async getMembershipStats() {
    const result = await this.getMembers({}, { limit: 1000 });
    const members = result.members;
    return {
      total:    members.length,
      active:   members.filter(m => m.membership_status === 'active').length,
      inactive: members.filter(m => m.membership_status === 'inactive').length,
      overdue:  members.filter(m => m.payment_status === 'overdue').length,
      byType:   members.reduce((acc, m) => {
        acc[m.membership_type] = (acc[m.membership_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const membersService = new MembersService();
