import type {
  FamilyRenewalRequest,
  MemberMembershipRepository,
  MinorRenewalRequest,
  RenewalRequest,
} from '../../application/membership/MemberMembershipRepository';
import type { Member } from '../../domain/Member';

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

export class ApiMemberMembershipRepository
  implements MemberMembershipRepository
{
  async renewMember(
    id: number,
    request: RenewalRequest,
  ): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/api/members/${id}/renew`,
      request,
    );

    return this.toDomain(response.data);
  }

  async renewMinor(
    id: number,
    request: MinorRenewalRequest,
  ): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/api/members/${id}/renew-minor`,
      request,
    );

    return this.toDomain(response.data);
  }

  async renewFamily(
    headId: number,
    request: FamilyRenewalRequest,
  ): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/api/members/${headId}/renew-family`,
      request,
    );

    return this.toDomain(response.data);
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
}