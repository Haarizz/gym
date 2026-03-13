import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface Plan {
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
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlanFormData {
  name: string;
  type: string;
  planType: string;
  durationType: string;
  durationValue: string;
  price: number | string;
  discount: number | string;
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
}

class PlansService {
  async getPlans(status?: string): Promise<Plan[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch plans: ${response.status}`);
    return response.json();
  }

  async getPlanById(id: number): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch plan: ${response.status}`);
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
    if (!response.ok) throw new Error(`Failed to create plan: ${response.status}`);
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
    if (!response.ok) throw new Error(`Failed to update plan: ${response.status}`);
    return response.json();
  }

  async deletePlan(id: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete plan: ${response.status}`);
  }

  async duplicatePlan(id: number): Promise<Plan> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/plans/${id}/duplicate`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to duplicate plan: ${response.status}`);
    return response.json();
  }
}

export const plansService = new PlansService();
