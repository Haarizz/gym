import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface PlanGroupApi {
  id: number;
  name: string;
  status: string; // Active | Inactive
}

class PlanGroupsService {

  async getPlanGroups(): Promise<PlanGroupApi[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/plan-groups`);
    if (!response.ok) throw new Error(`Failed to fetch plan groups: ${response.status}`);
    return response.json();
  }

  async createPlanGroup(name: string): Promise<PlanGroupApi> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/plan-groups`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Failed to create plan group: ${response.status}`);
    }
    return response.json();
  }

  async updatePlanGroup(id: number, payload: { name?: string; status?: string }): Promise<PlanGroupApi> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/plan-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Failed to update plan group: ${response.status}`);
    }
    return response.json();
  }

  async deletePlanGroup(id: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/plan-groups/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete plan group: ${response.status}`);
  }
}

export const planGroupsService = new PlanGroupsService();
