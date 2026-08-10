import type { FacilityRepository } from '../application/FacilityRepository';
import type { Facility, FacilityRequest, FacilityFilters } from '../domain/Facility';
import { apiClient } from '@/core/network/apiClient';

interface FacilityResponseDTO {
  id: string;
  facility_id?: string;
  name?: string;
  occupancy_limit?: number;
  status?: string;
  description?: string;
  icon_name?: string;
  rates?: Record<string, number>;
  bookings_this_month?: number;
}

export class ApiFacilityRepository implements FacilityRepository {
  async getFacilities(filters?: FacilityFilters): Promise<Facility[]> {
    const response = await apiClient.get<FacilityResponseDTO[]>('/facilities', {
      params: filters,
    });
    return response.data.map((item) => this.toDomain(item));
  }

  async createFacility(request: FacilityRequest): Promise<Facility> {
    const response = await apiClient.post<FacilityResponseDTO>('/facilities', this.toRequest(request));
    return this.toDomain(response.data);
  }

  async updateFacility(id: number, request: FacilityRequest): Promise<Facility> {
    const response = await apiClient.put<FacilityResponseDTO>(`/facilities/${id}`, this.toRequest(request));
    return this.toDomain(response.data);
  }

  async deleteFacility(id: number): Promise<void> {
    await apiClient.delete(`/facilities/${id}`);
  }

  async toggleStatus(id: number): Promise<Facility> {
    const response = await apiClient.post<FacilityResponseDTO>(`/facilities/${id}/toggle-status`);
    return this.toDomain(response.data);
  }

  private toRequest(request: FacilityRequest) {
    return {
      name: request.name,
      occupancy_limit: request.occupancyLimit,
      status: request.status,
      description: request.description,
      icon_name: request.iconName,
      rates: request.rates,
    };
  }

  private toDomain(response: FacilityResponseDTO): Facility {
    return {
      id: response.id,
      facilityId: response.facility_id,
      name: response.name,
      occupancyLimit: response.occupancy_limit,
      status: response.status,
      description: response.description,
      iconName: response.icon_name,
      rates: response.rates,
      bookingsThisMonth: response.bookings_this_month,
    };
  }
}
