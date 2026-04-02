import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface FacilityApi {
  id: string;
  facility_id: string;
  name: string;
  occupancy_limit: number;
  status: string; // Active | Inactive
  description: string | null;
  icon_name: string | null;
  rates: Record<string, number>; // { "Per Hour": 100, "Per Half Day": 400 }
  bookings_this_month: number;
}

export interface FacilityRequest {
  name: string;
  occupancy_limit: number;
  status?: string;
  description?: string;
  icon_name?: string;
  rates: Record<string, number>;
}

class FacilitiesService {

  async getFacilities(params?: { status?: string; search?: string }): Promise<FacilityApi[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/facilities?${query.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch facilities: ${response.status}`);
    return response.json();
  }

  async createFacility(payload: FacilityRequest): Promise<FacilityApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/facilities`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to create facility: ${response.status}`);
    return response.json();
  }

  async updateFacility(id: string, payload: Partial<FacilityRequest>): Promise<FacilityApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/facilities/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to update facility: ${response.status}`);
    return response.json();
  }

  async deleteFacility(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/facilities/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete facility: ${response.status}`);
  }

  async toggleStatus(id: string): Promise<FacilityApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/facilities/${id}/toggle-status`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to toggle facility status: ${response.status}`);
    return response.json();
  }
}

export const facilitiesService = new FacilitiesService();
