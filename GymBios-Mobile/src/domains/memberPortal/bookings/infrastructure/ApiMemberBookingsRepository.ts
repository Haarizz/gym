import { apiClient } from '@/core/network/apiClient';
import { MemberBookingsRepository } from './MemberBookingsRepository';
import { MemberBookingData, BookingStatsData, AvailableClassData, CreateMemberBookingRequest } from '../domain/MemberBookingData';

export class ApiMemberBookingsRepository implements MemberBookingsRepository {
  async getUpcomingBookings(): Promise<MemberBookingData[]> {
    const response = await apiClient.get<MemberBookingData[]>('/mobile/member/bookings');
    return response.data;
  }

  async getPastBookings(): Promise<MemberBookingData[]> {
    const response = await apiClient.get<MemberBookingData[]>('/mobile/member/bookings/history');
    return response.data;
  }

  async getStats(): Promise<BookingStatsData> {
    const response = await apiClient.get<BookingStatsData>('/mobile/member/bookings/stats');
    return response.data;
  }

  async cancelBooking(bookingId: number): Promise<void> {
    await apiClient.post(`/mobile/member/bookings/${bookingId}/cancel`);
  }

  async getAvailableClasses(date: string): Promise<AvailableClassData[]> {
    const response = await apiClient.get<AvailableClassData[]>(`/mobile/member/bookings/available-classes?date=${date}`);
    return response.data;
  }

  async createBooking(request: CreateMemberBookingRequest): Promise<MemberBookingData> {
    const response = await apiClient.post<MemberBookingData>('/mobile/member/bookings', request);
    return response.data;
  }
}

export const memberBookingsRepository = new ApiMemberBookingsRepository();
