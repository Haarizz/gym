import type { FacilityRepository } from '../application/FacilityRepository';
import type { Facility, FacilityRequest, FacilityFilters } from '../domain/Facility';
import type { Booking, BookingFilters } from '../domain/Booking';
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

interface BookingResponseDTO {
  id: string;
  sessionId?: string;
  session_id?: string;
  sessionName?: string;
  session_name?: string;
  trainerName?: string;
  trainer_name?: string;
  date?: string;
  startTime?: string;
  start_time?: string;
  type?: string;
  status?: string;
  paymentStatus?: string;
  payment_status?: string;
  price?: number;
  qrCode?: string;
  qr_code?: string;
  guest?: boolean;
  is_guest?: boolean;
  memberId?: string;
  member_id?: string;
  memberName?: string;
  member_name?: string;
  guestName?: string;
  guest_name?: string;
  guestEmail?: string;
  guest_email?: string;
  guestPhone?: string;
  guest_phone?: string;
  createdAt?: string;
  created_at?: string;
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

  async getBookings(filters?: BookingFilters): Promise<Booking[]> {
    const params: Record<string, string | undefined> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.search) params.search = filters.search;

    const response = await apiClient.get<BookingResponseDTO[]>('/bookings', { params });
    return (response.data ?? []).map((item) => this.toBookingDomain(item));
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

  private toBookingDomain(response: BookingResponseDTO): Booking {
    return {
      id: String(response.id),
      sessionId: response.sessionId ?? response.session_id,
      sessionName: response.sessionName ?? response.session_name,
      trainerName: response.trainerName ?? response.trainer_name,
      date: response.date,
      startTime: response.startTime ?? response.start_time,
      type: response.type,
      status: response.status,
      paymentStatus: response.paymentStatus ?? response.payment_status,
      price: response.price != null ? Number(response.price) : undefined,
      qrCode: response.qrCode ?? response.qr_code,
      guest: response.guest ?? response.is_guest,
      memberId: response.memberId ?? response.member_id,
      memberName: response.memberName ?? response.member_name,
      guestName: response.guestName ?? response.guest_name,
      guestEmail: response.guestEmail ?? response.guest_email,
      guestPhone: response.guestPhone ?? response.guest_phone,
      createdAt: response.createdAt ?? response.created_at,
    };
  }
}

