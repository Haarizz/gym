import { apiClient } from '@/core/network/apiClient';
import type { CenterSummary, CenterDetails, CenterPlan } from '../domain/models';

export const discoveryApi = {
  getCenters: async (): Promise<CenterSummary[]> => {
    const response = await apiClient.get<any[]>('/mobile/discovery/centers');
    return response.data.map(item => ({
      tenantSlug: item.tenant_slug,
      branchId: item.branch_id,
      centerName: item.center_name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      centerType: item.center_type,
      startingPrice: item.starting_price,
    }));
  },

  getCenterDetails: async (tenantSlug: string, branchId: number): Promise<CenterDetails> => {
    const response = await apiClient.get<any>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}`
    );
    const data = response.data;
    return {
      tenantSlug: data.tenant_slug,
      branchId: data.branch_id,
      centerName: data.center_name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      centerType: data.center_type,
      phone: data.phone,
      operatingHours: data.operating_hours,
      accessType: data.access_type,
      about: data.about,
      amenities: data.amenities || [],
      trainers: data.trainers || [],
    };
  },

  getCenterPlans: async (tenantSlug: string, branchId: number): Promise<CenterPlan[]> => {
    const response = await apiClient.get<any[]>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}/plans`
    );
    return response.data.map(plan => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      planType: plan.plan_type,
      durationType: plan.duration_type,
      durationValue: plan.duration_value,
      duration: plan.duration,
      price: plan.price,
      discount: plan.discount,
      status: plan.status,
      description: plan.description,
      maxSessions: plan.max_sessions,
      assignableTrainers: plan.assignable_trainers || [],
      familyBillingMode: plan.family_billing_mode,
      pricePerMember: plan.price_per_member,
      maxFamilyMembers: plan.max_family_members,
      maxAdultMembers: plan.max_adult_members,
      maxChildMembers: plan.max_child_members,
      allowAdditionalMembers: plan.allow_additional_members,
      additionalMemberPrice: plan.additional_member_price,
      autoCalculateTotal: plan.auto_calculate_total,
      membershipCapacity: plan.membership_capacity,
      maxCapacity: plan.max_capacity,
      attendanceLimit: plan.attendance_limit,
      attendanceValue: plan.attendance_value,
      attendancePeriod: plan.attendance_period,
      maxFreezeDays: plan.max_freeze_days,
      maxFreezeOccurrences: plan.max_freeze_occurrences,
      chargePerExtraDay: plan.charge_per_extra_day,
      freeDaysAllowed: plan.free_days_allowed,
      autoUnfreeze: plan.auto_unfreeze,
      trainingStreams: plan.training_streams || [],
      selectedFacilities: plan.selected_facilities || [],
      selectedPromotions: plan.selected_promotions || [],
      selectedCampaigns: plan.selected_campaigns || [],
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    }));
  },

  purchaseMembership: async (tenantSlug: string, branchId: number, planId: number): Promise<any> => {
    const response = await apiClient.post<any>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}/purchase`,
      { planId }
    );
    return response.data;
  },
};
