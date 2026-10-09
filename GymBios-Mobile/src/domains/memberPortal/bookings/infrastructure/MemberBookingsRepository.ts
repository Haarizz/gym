import {
  MemberBookingData,
  BookingStatsData,
  AvailableClassData,
  CreateMemberBookingRequest,
  RefundMethod,
} from '../domain/MemberBookingData';

export interface MemberBookingsRepository {
  getUpcomingBookings(): Promise<MemberBookingData[]>;
  getPastBookings(): Promise<MemberBookingData[]>;
  getStats(): Promise<BookingStatsData>;
  cancelBooking(bookingId: number, refundMethod?: RefundMethod): Promise<MemberBookingData>;
  getAvailableClasses(date: string): Promise<AvailableClassData[]>;
  createBooking(request: CreateMemberBookingRequest): Promise<MemberBookingData>;
}
