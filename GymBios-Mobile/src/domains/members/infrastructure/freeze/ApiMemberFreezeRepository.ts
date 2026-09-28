import type {
  FreezeRequest,
  MemberFreezeRepository,
} from '../../application/freeze/MemberFreezeRepository';
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
  // POST /members/{id}/freeze and /unfreeze both return MemberResponseDTO
  // (see MemberController), which serializes membership_status /
  // membership_start_date / membership_end_date — not status / start_date /
  // end_date / is_frozen. Those keys don't exist on the real response, so
  // reading them left every freeze/unfreeze result's status/isFrozen
  // undefined regardless of what the backend actually persisted (BG_64).
  membership_status: string;
  membership_start_date: string;
  membership_end_date?: string | null;
  payment_status: string;

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

export class ApiMemberFreezeRepository implements MemberFreezeRepository {
  async freezeMember(
    id: number,
    request: FreezeRequest,
  ): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/members/${id}/freeze`,
      request,
    );

    return this.toDomain(response.data);
  }

  async unfreezeMember(id: number): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/members/${id}/unfreeze`,
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
      status: response.membership_status,
      startDate: response.membership_start_date,
      endDate: response.membership_end_date ?? undefined,
      paymentStatus: response.payment_status,

      // No boolean is_frozen on the DTO — derive it the same way the backend
      // itself does (MobileMemberMembershipService, buildSpec's status filter).
      isFrozen: response.membership_status?.toLowerCase() === 'frozen',
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