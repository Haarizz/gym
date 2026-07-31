import type {
  MembershipPlanRequest,
  MembershipPlanRepository,
} from '../application/MembershipPlanRepository';
import type { MembershipPlan } from '../domain/MembershipPlan';

import { apiClient } from '@/core/network/apiClient';

interface MembershipPlanResponse {
  id: number;
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  duration: string;
  price: number;
  discount: number;
  status: string;
  description: string;
  maxSessions?: number | null;
  assignableTrainers: string[];

  familyBillingMode?: string | null;
  pricePerMember?: number | null;
  maxFamilyMembers?: number | null;
  maxAdultMembers?: number | null;
  maxChildMembers?: number | null;
  allowAdditionalMembers?: boolean | null;
  additionalMemberPrice?: number | null;
  autoCalculateTotal?: boolean | null;

  membershipCapacity?: string | null;
  maxCapacity?: number | null;
  attendanceLimit?: string | null;
  attendanceValue?: number | null;
  attendancePeriod?: string | null;

  maxFreezeDays?: number | null;
  maxFreezeOccurrences?: number | null;
  chargePerExtraDay?: number | null;
  freeDaysAllowed?: number | null;
  autoUnfreeze?: boolean | null;

  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];

  createdAt?: string;
  updatedAt?: string;
}

export class ApiMembershipPlanRepository implements MembershipPlanRepository {
  async getPlans(status?: string): Promise<MembershipPlan[]> {
    const response = await apiClient.get<MembershipPlanResponse[]>(
      '/plans',
      {
        params: status ? { status } : undefined,
      },
    );

    return response.data.map(item => this.toDomain(item));
  }

  async getPlanById(id: number): Promise<MembershipPlan> {
    const response = await apiClient.get<MembershipPlanResponse>(
      `/plans/${id}`,
    );

    return this.toDomain(response.data);
  }

  async createPlan(request: MembershipPlanRequest): Promise<MembershipPlan> {
    const response = await apiClient.post<MembershipPlanResponse>(
      '/plans',
      request,
    );

    return this.toDomain(response.data);
  }

  async updatePlan(
    id: number,
    request: MembershipPlanRequest,
  ): Promise<MembershipPlan> {
    const response = await apiClient.put<MembershipPlanResponse>(
      `/plans/${id}`,
      request,
    );

    return this.toDomain(response.data);
  }

  async deletePlan(id: number): Promise<void> {
    await apiClient.delete(`/plans/${id}`);
  }

  async duplicatePlan(id: number): Promise<MembershipPlan> {
    const response = await apiClient.post<MembershipPlanResponse>(
      `/plans/${id}/duplicate`,
    );

    return this.toDomain(response.data);
  }

  private toDomain(response: MembershipPlanResponse): MembershipPlan {
    return {
      id: response.id,

      name: response.name,
      type: response.type,
      planType: response.planType,
      status: response.status,
      description: response.description,

      durationType: response.durationType,
      durationValue: response.durationValue,
      duration: response.duration,

      price: response.price,
      discount: response.discount,

      maxSessions: response.maxSessions ?? undefined,
      assignableTrainers: response.assignableTrainers,

      familyBillingMode: response.familyBillingMode ?? undefined,
      pricePerMember: response.pricePerMember ?? undefined,
      maxFamilyMembers: response.maxFamilyMembers ?? undefined,
      maxAdultMembers: response.maxAdultMembers ?? undefined,
      maxChildMembers: response.maxChildMembers ?? undefined,
      allowAdditionalMembers: response.allowAdditionalMembers ?? undefined,
      additionalMemberPrice: response.additionalMemberPrice ?? undefined,
      autoCalculateTotal: response.autoCalculateTotal ?? undefined,

      membershipCapacity: response.membershipCapacity ?? undefined,
      maxCapacity: response.maxCapacity ?? undefined,
      attendanceLimit: response.attendanceLimit ?? undefined,
      attendanceValue: response.attendanceValue ?? undefined,
      attendancePeriod: response.attendancePeriod ?? undefined,

      maxFreezeDays: response.maxFreezeDays ?? undefined,
      maxFreezeOccurrences: response.maxFreezeOccurrences ?? undefined,
      chargePerExtraDay: response.chargePerExtraDay ?? undefined,
      freeDaysAllowed: response.freeDaysAllowed ?? undefined,
      autoUnfreeze: response.autoUnfreeze ?? false,

      trainingStreams: response.trainingStreams,
      selectedFacilities: response.selectedFacilities,
      selectedPromotions: response.selectedPromotions,
      selectedCampaigns: response.selectedCampaigns,

      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }
}