import type {
  AddFamilyMemberRequest,
  MemberFamilyRepository,
} from '../../application/family/MemberFamilyRepository';
import type { FamilyGroup } from '../../domain/FamilyGroup';
import type { FamilyMember } from '../../domain/FamilyMember';
import type { Member } from '../../domain/Member';

import { apiClient } from '@/core/network/apiClient';

interface FamilyMemberResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string | null;
  gender?: string | null;
  family_role: string;
  membership_type: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  is_frozen: boolean;
  photo_url?: string | null;
}

interface FamilyGroupResponse {
  head_id: number;
  head_name: string;
  head_email: string;
  head_phone: string;
  billing_mode: string;
  total_members: number;
  members: FamilyMemberResponse[];
}

interface MemberResponse {
  id: number;

  first_name: string;
  last_name: string;
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

export class ApiMemberFamilyRepository implements MemberFamilyRepository {
  async getFamily(memberId: number): Promise<FamilyGroup> {
    const response = await apiClient.get<FamilyGroupResponse>(
      `/api/members/${memberId}/family`,
    );

    const data = response.data;

    return {
      headId: data.head_id,
      headName: data.head_name,
      headEmail: data.head_email,
      headPhone: data.head_phone,
      billingMode: data.billing_mode,
      totalMembers: data.total_members,
      members: data.members.map(member => this.toFamilyMemberDomain(member)),
    };
  }

  async addFamilyMember(
    headId: number,
    request: AddFamilyMemberRequest,
  ): Promise<Member> {
    const response = await apiClient.post<MemberResponse>(
      `/api/members/${headId}/family-members`,
      this.toFamilyMemberRequest(request),
    );

    return this.toMemberDomain(response.data);
  }

  private toFamilyMemberDomain(
    response: FamilyMemberResponse,
  ): FamilyMember {
    return {
      id: response.id,
      firstName: response.first_name,
      lastName: response.last_name,
      email: response.email,
      phone: response.phone,
      dateOfBirth: response.date_of_birth ?? undefined,
      gender: response.gender ?? undefined,
      familyRole: response.family_role,
      membershipType: response.membership_type,
      status: response.status,
      startDate: response.start_date,
      endDate: response.end_date ?? undefined,
      isFrozen: response.is_frozen,
      photoUrl: response.photo_url ?? undefined,
    };
  }

  private toMemberDomain(response: MemberResponse): Member {
    return {
      id: response.id,

      firstName: response.first_name,
      lastName: response.last_name,
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

  private toFamilyMemberRequest(
    request: AddFamilyMemberRequest,
  ): Record<string, unknown> {
    return {
      first_name: request.firstName,
      last_name: request.lastName,
      email: request.email,
      phone: request.phone,
      date_of_birth: request.dateOfBirth,
      gender: request.gender,
      family_role: request.familyRole,
      membership_type: request.membershipType,
      status: request.status,
      start_date: request.startDate,
    };
  }
}