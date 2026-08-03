import type {
  CreateMemberRequest,
  MemberDirectoryRepository,
  MemberFilters,
  UpdateMemberRequest,
} from '../../application/directory/MemberDirectoryRepository';
import type { Member, MemberPage } from '../../domain/Member';

import { apiClient } from '@/core/network/apiClient';

interface MemberResponse {
  id: string;
  member_id: string;

  name: string;
  email: string;
  phone: string;
  date_of_birth?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  address?: string | null;

  membership_type: string;
  membership_plan_id?: number | null;
  membership_plan_name?: string | null;
  membership_plan_price?: number | null;
  status: string;
  start_date: string;
  end_date?: string | null;
  payment_status: string;

  is_frozen: boolean;
  freeze_start_date?: string | null;
  freeze_end_date?: string | null;
  freeze_days_used?: number | null;

  family_head_id?: number | null;
  family_head_name?: string | null;
  family_billing_mode?: string | null;
  family_role?: string | null;

  user_id?: number | null;
  app_username?: string | null;
  app_access_enabled: boolean;

  created_at?: string;
  updated_at?: string;
}

interface MembersPageResponse {
  members: MemberResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export class ApiMemberDirectoryRepository
  implements MemberDirectoryRepository
{
  async getMembers(filters?: MemberFilters): Promise<MemberPage> {
    const params: Record<string, string | number | undefined> = {};

    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    if (filters?.membershipType) params.membership_type = filters.membershipType;
    if (filters?.paymentStatus) params.payment_status = filters.paymentStatus;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get<MembersPageResponse>(
      '/members',
      { params },
    );

    return {
      content: response.data.members.map(item => this.toDomain(item)),
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalElements: response.data.pagination.total,
      totalPages: response.data.pagination.total_pages,
    };
  }

  async getMember(id: number): Promise<Member> {
    const response = await apiClient.get<MemberResponse>(
      `/members/${id}`,
    );

    return this.toDomain(response.data);
  }

  async getCurrentMember(): Promise<Member> {
    const response = await apiClient.get<MemberResponse>(
      '/members/me',
    );

    return this.toDomain(response.data);
  }

  async getMemberByUser(userId: number): Promise<Member> {
    const response = await apiClient.get<MemberResponse>(
      `/members/by-user/${userId}`,
    );

    return this.toDomain(response.data);
  }

  async createMember(request: CreateMemberRequest): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      '/members',
      this.toRequest(request),
    );

    return this.toDomain(response.data);
  }

  async updateMember(
    id: number,
    request: UpdateMemberRequest,
  ): Promise<Member> {
    const response = await apiClient.put<MemberResponse>(
      `/members/${id}`,
      this.toRequest(request),
    );

    return this.toDomain(response.data);
  }

  async deleteMember(id: number): Promise<void> {
    await apiClient.delete(`/members/${id}`);
  }

  private toDomain(response: MemberResponse): Member {
    return {
      id: Number(response.id),
      memberId: response.member_id,

      name: response.name,
      email: response.email,
      phone: response.phone,
      dateOfBirth: response.date_of_birth ?? undefined,
      gender: response.gender ?? undefined,
      photoUrl: response.photo_url ?? undefined,
      address: response.address ?? undefined,

      membershipType: response.membership_type,
      membershipPlanId: response.membership_plan_id ?? undefined,
      membershipPlanName: response.membership_plan_name ?? undefined,
      membershipPlanPrice: response.membership_plan_price ?? undefined,
      status: response.status,
      startDate: response.start_date,
      endDate: response.end_date ?? undefined,
      paymentStatus: response.payment_status,

      isFrozen: response.is_frozen,
      freezeStartDate: response.freeze_start_date ?? undefined,
      freezeEndDate: response.freeze_end_date ?? undefined,
      freezeDaysUsed: response.freeze_days_used ?? undefined,

      familyHeadId: response.family_head_id ?? undefined,
      familyHeadName: response.family_head_name ?? undefined,
      familyBillingMode: response.family_billing_mode ?? undefined,
      familyRole: response.family_role ?? undefined,

      userId: response.user_id ?? undefined,
      appUsername: response.app_username ?? undefined,
      appAccessEnabled: response.app_access_enabled,

      createdAt: response.created_at,
      updatedAt: response.updated_at,
    };
  }

  private toRequest(
    request: CreateMemberRequest | UpdateMemberRequest,
  ): Record<string, unknown> {
    return {
      name: request.name,
      email: request.email,
      phone: request.phone,
      date_of_birth: request.dateOfBirth,
      gender: request.gender,
      photo_url: request.photoUrl,
      address: request.address,
      membership_type: request.membershipType,
      membership_plan_id: request.membershipPlanId,
      status: request.status,
      start_date: request.startDate,
      ...('endDate' in request ? { end_date: request.endDate } : {}),
      payment_status: request.paymentStatus,
      ...('paymentMethodUsed' in request && request.paymentMethodUsed
        ? {
            payment_method_used: request.paymentMethodUsed,
            payment_breakdown: request.paymentBreakdown
              ? request.paymentBreakdown.map((split) => ({
                  method: split.method,
                  amount: split.amount,
                  reference: split.reference,
                  card_type: split.cardType,
                  cheque_number: split.chequeNumber,
                  cheque_date: split.chequeDate,
                  bank_name: split.bankName,
                  bank_account_code: split.bankAccountCode,
                  bank_account_name: split.bankAccountName,
                  online_payment_type: split.onlinePaymentType,
                  provider_name: split.providerName,
                }))
              : undefined,
            discount_applied: request.discountApplied,
            outstanding_balance: request.outstandingBalance,
            bank_account_code: request.bankAccountCode,
            bank_account_name: request.bankAccountName,
          }
        : {}),
    };
  }
}