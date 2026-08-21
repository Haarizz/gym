import { MemberBookingData, BookingStatsData, AvailableClassData, CreateMemberBookingRequest } from '../domain/MemberBookingData';

export interface MemberBookingsRepository {
  getUpcomingBookings(): Promise<MemberBookingData[]>;
  getPastBookings(): Promise<MemberBookingData[]>;
  getStats(): Promise<BookingStatsData>;
  cancelBooking(bookingId: number): Promise<void>;
  getAvailableClasses(date: string): Promise<AvailableClassData[]>;
  createBooking(request: CreateMemberBookingRequest): Promise<MemberBookingData>;
}
