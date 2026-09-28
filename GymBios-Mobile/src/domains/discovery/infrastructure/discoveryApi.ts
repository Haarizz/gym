import { apiClient } from '@/core/network/apiClient';
import type { CenterSummary, CenterDetails, CenterPlan } from '../domain/models';
import type { PaymentResult } from '@/shared/payment/types';

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
      accessType: item.access_type,
      coverImageUrl: item.cover_image_url,
      avgRating: item.avg_rating,
      reviewCount: item.review_count ?? 0,
      acceptedPaymentMethods: item.accepted_payment_methods || [],
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
      establishedYear: data.established_year,
      coverImageUrl: data.cover_image_url,
      galleryImageUrls: data.gallery_image_urls || [],
      acceptedPaymentMethods: data.accepted_payment_methods || [],
      bnplEnabled: data.bnpl_enabled || false,
      bnplProvider: data.bnpl_provider,
      taxPercentage: data.tax_percentage,
      taxInclusive: data.tax_inclusive || false,
      termsAndPolicies: data.terms_and_policies,
      avgRating: data.avg_rating,
      reviewCount: data.review_count ?? 0,
      amenities: data.amenities || [],
      trainers: data.trainers || [],
    };
  },

  getCenterPlans: async (tenantSlug: string, branchId: number): Promise<CenterPlan[]> => {
    const response = await apiClient.get<any[]>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}/plans`
    );
    // MembershipPlanResponseDTO is camelCase (it opts out of the global SNAKE_CASE
    // naming for the web app), so read camelCase first; snake_case kept as fallback.
    return response.data.map(plan => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      planType: plan.planType ?? plan.plan_type,
      durationType: plan.durationType ?? plan.duration_type,
      durationValue: plan.durationValue ?? plan.duration_value,
      duration: plan.duration,
      price: plan.price,
      discount: plan.discount,
      status: plan.status,
      description: plan.description,
      maxSessions: plan.maxSessions ?? plan.max_sessions,
      assignableTrainers: (plan.assignableTrainers ?? plan.assignable_trainers) || [],
      familyBillingMode: plan.familyBillingMode ?? plan.family_billing_mode,
      pricePerMember: plan.pricePerMember ?? plan.price_per_member,
      maxFamilyMembers: plan.maxFamilyMembers ?? plan.max_family_members,
      maxAdultMembers: plan.maxAdultMembers ?? plan.max_adult_members,
      maxChildMembers: plan.maxChildMembers ?? plan.max_child_members,
      allowAdditionalMembers: plan.allowAdditionalMembers ?? plan.allow_additional_members,
      additionalMemberPrice: plan.additionalMemberPrice ?? plan.additional_member_price,
      autoCalculateTotal: plan.autoCalculateTotal ?? plan.auto_calculate_total,
      membershipCapacity: plan.membershipCapacity ?? plan.membership_capacity,
      maxCapacity: plan.maxCapacity ?? plan.max_capacity,
      attendanceLimit: plan.attendanceLimit ?? plan.attendance_limit,
      attendanceValue: plan.attendanceValue ?? plan.attendance_value,
      attendancePeriod: plan.attendancePeriod ?? plan.attendance_period,
      maxFreezeDays: plan.maxFreezeDays ?? plan.max_freeze_days,
      maxFreezeOccurrences: plan.maxFreezeOccurrences ?? plan.max_freeze_occurrences,
      chargePerExtraDay: plan.chargePerExtraDay ?? plan.charge_per_extra_day,
      freeDaysAllowed: plan.freeDaysAllowed ?? plan.free_days_allowed,
      autoUnfreeze: plan.autoUnfreeze ?? plan.auto_unfreeze,
      trainingStreams: (plan.trainingStreams ?? plan.training_streams) || [],
      selectedFacilities: (plan.selectedFacilities ?? plan.selected_facilities) || [],
      selectedPromotions: (plan.selectedPromotions ?? plan.selected_promotions) || [],
      selectedCampaigns: (plan.selectedCampaigns ?? plan.selected_campaigns) || [],
      createdAt: plan.createdAt ?? plan.created_at,
      updatedAt: plan.updatedAt ?? plan.updated_at,
    }));
  },

  purchaseMembership: async (
    tenantSlug: string,
    branchId: number,
    planId: number,
    payment?: PaymentResult
  ): Promise<any> => {
    const response = await apiClient.post<any>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}/purchase`,
      {
        planId,
        paymentMethodUsed: payment?.paymentMethodUsed,
        paymentBreakdown: payment?.paymentBreakdown,
        paidAmount: payment?.summary.paidAmount,
        outstandingBalance: payment?.outstandingBalance,
        paymentDueDate: payment?.summary.paymentDueDate,
        bankAccountCode: payment?.bankAccountCode,
        bankAccountName: payment?.bankAccountName,
      }
    );
    return response.data;
  },
};
