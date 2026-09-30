import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface Plan {
  id: number;
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  duration: string;
  /** Regular price. */
  price: number;
  /** Legacy percent field — no longer used for pricing; see the offer fields. */
  discount: number;
  // Offer: a manual discount every member gets, optionally between two dates.
  offerType: 'percentage' | 'fixed' | null;
  offerValue: number | null;
  offerLabel: string | null;
  offerStartDate: string | null; // yyyy-MM-dd
  offerEndDate: string | null;   // yyyy-MM-dd
  /** Server-computed for today: whether the offer is running, what it takes off, what members pay. */
  offerActive: boolean;
  offerDiscountAmount: number;
  effectivePrice: number;
  status: string;
  description: string;
  maxSessions: number | null;
  assignableTrainers: string[];
  membershipCapacity: string;
  maxCapacity: number | null;
  attendanceLimit: string;
  attendanceValue: number | null;
  attendancePeriod: string;
  maxFreezeDays: number | null;
  maxFreezeOccurrences: number | null;
  chargePerExtraDay: number | null;
  freeDaysAllowed: number | null;
  autoUnfreeze: boolean;
  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
  // Family plan settings (only meaningful when planType === "Family")
  familyBillingMode: string | null;        // "individual" | "family_head"
  pricePerMember: number | null;
  maxFamilyMembers: number | null;
  maxAdultMembers: number | null;
  maxChildMembers: number | null;
  allowAdditionalMembers: boolean | null;
  additionalMemberPrice: number | null;
  autoCalculateTotal: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** The plan has an offer running today (server-computed). */
export function planHasOffer(plan: Pick<Plan, 'offerActive' | 'offerDiscountAmount'>): boolean {
  return !!plan.offerActive && Number(plan.offerDiscountAmount) > 0;
}

/** What a member pays for the plan today, before any code — the offer price when one is running. */
export function planOfferPrice(plan: Pick<Plan, 'price' | 'effectivePrice' | 'offerActive' | 'offerDiscountAmount'>): number {
  return planHasOffer(plan) ? Number(plan.effectivePrice) : Number(plan.price) || 0;
}

export interface PlanFormData {
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  price: number | string;
  discount: number | string;
  /** '' removes the offer; omit to leave it unchanged. */
  offerType?: 'percentage' | 'fixed' | '';
  offerValue?: number | null;
  offerLabel?: string | null;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
  status: string;
  description: string;
  maxSessions: number | string | null;
  assignableTrainers: string[];
  membershipCapacity: string;
  maxCapacity: number | string | null;
  attendanceLimit: string;
  attendanceValue: number | string | null;
  attendancePeriod: string;
  maxFreezeDays: number | string | null;
  maxFreezeOccurrences: number | string | null;
  chargePerExtraDay: number | string | null;
  freeDaysAllowed: number | string | null;
  autoUnfreeze: boolean;
  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
  // Family plan settings (only meaningful when planType === "Family")
  familyBillingMode?: string;
  pricePerMember?: number | string | null;
  maxFamilyMembers?: number | string | null;
  maxAdultMembers?: number | string | null;
  maxChildMembers?: number | string | null;
  allowAdditionalMembers?: boolean;
  additionalMemberPrice?: number | string | null;
  autoCalculateTotal?: boolean;
}

class PlansService {
  async getPlans(status?: string): Promise<Plan[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans?${params.toString()}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch plans: ${response.status}`));
    return response.json();
  }

  async getPlanById(id: number): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch plan: ${response.status}`));
    return response.json();
  }

  async createPlan(data: PlanFormData): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to create plan: ${response.status}`));
    return response.json();
  }

  async updatePlan(id: number, data: PlanFormData): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to update plan: ${response.status}`));
    return response.json();
  }

  async deletePlan(id: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to delete plan: ${response.status}`));
  }

  async duplicatePlan(id: number): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}/duplicate`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to duplicate plan: ${response.status}`));
    return response.json();
  }
}

export const plansService = new PlansService();
