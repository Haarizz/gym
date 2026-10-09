import { apiClient } from '@/core/network/apiClient';
import { MemberBookingsRepository } from './MemberBookingsRepository';
import {
  MemberBookingData,
  BookingStatsData,
  AvailableClassData,
  CreateMemberBookingRequest,
  RefundMethod,
} from '../domain/MemberBookingData';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapBooking(d: any): MemberBookingData {
  return {
    id: d.id,
    classId: d.class_id ?? d.classId,
    className: d.class_name ?? d.className,
    type: d.type ?? null,
    trainerName: d.trainer_name ?? d.trainerName,
    date: d.date,
    startTime: d.start_time ?? d.startTime,
    endTime: d.end_time ?? d.endTime,
    durationMinutes: d.duration_minutes ?? d.durationMinutes,
    location: d.location,
    status: d.status,
    capacity: d.capacity ?? null,
    availableSpots: d.available_spots ?? d.availableSpots ?? null,
    canCancel: d.can_cancel ?? d.canCancel ?? false,
    price: num(d.price),
    grossPrice: num(d.gross_price),
    discountAmount: num(d.discount_amount),
    discountLabel: d.discount_label ?? null,
    walletAmount: num(d.wallet_amount),
    paymentStatus: d.payment_status ?? null,
    receiptId: d.receipt_id ?? null,
    refundDeadline: d.refund_deadline ?? null,
    refundableIfCancelledNow: d.refundable_if_cancelled_now ?? false,
    refundStatus: d.refund_status ?? null,
    refundMethod: d.refund_method ?? null,
    refundedAmount: num(d.refunded_amount),
    cancelledBy: d.cancelled_by ?? null,
  };
}

function mapAvailableClass(d: any): AvailableClassData {
  return {
    classId: d.class_id ?? d.classId,
    className: d.class_name ?? d.className,
    type: d.type,
    trainerName: d.trainer_name ?? d.trainerName ?? null,
    date: d.date,
    startTime: d.start_time ?? d.startTime,
    endTime: d.end_time ?? d.endTime,
    durationMinutes: d.duration_minutes ?? d.durationMinutes,
    location: d.location,
    capacity: d.capacity ?? null,
    availableSpots: d.available_spots ?? d.availableSpots ?? null,
    memberBookingState: d.member_booking_state ?? d.memberBookingState ?? null,
    price: num(d.price),
    refundDeadline: d.refund_deadline ?? null,
    refundableIfBookedNow: d.refundable_if_booked_now ?? true,
  };
}

export class ApiMemberBookingsRepository implements MemberBookingsRepository {
  async getUpcomingBookings(): Promise<MemberBookingData[]> {
    const response = await apiClient.get<any[]>('/mobile/member/bookings');
    return response.data.map(mapBooking);
  }

  async getPastBookings(): Promise<MemberBookingData[]> {
    const response = await apiClient.get<any[]>('/mobile/member/bookings/history');
    return response.data.map(mapBooking);
  }

  async getStats(): Promise<BookingStatsData> {
    const response = await apiClient.get<BookingStatsData>('/mobile/member/bookings/stats');
    return response.data;
  }

  async cancelBooking(bookingId: number, refundMethod: RefundMethod = 'WALLET'): Promise<MemberBookingData> {
    const response = await apiClient.post<any>(`/mobile/member/bookings/${bookingId}/cancel`, {
      refund_method: refundMethod,
    });
    return mapBooking(response.data);
  }

  async getAvailableClasses(date: string): Promise<AvailableClassData[]> {
    const response = await apiClient.get<any[]>(`/mobile/member/bookings/available-classes?date=${date}`);
    return response.data.map(mapAvailableClass);
  }

  async createBooking(request: CreateMemberBookingRequest): Promise<MemberBookingData> {
    const response = await apiClient.post<any>(
      '/mobile/member/bookings',
      {
        class_id: request.classId,
        reward_pass_id: request.rewardPassId,
        coupon_code: request.couponCode,
        wallet_amount: request.walletAmount,
        expected_amount: request.expectedAmount,
        payment_method_used: request.paymentMethodUsed,
        payment_breakdown: request.paymentBreakdown?.map((split) => ({
          method: split.method,
          amount: split.amount,
          reference: split.reference,
          card_type: split.cardType,
          cheque_number: split.chequeNumber,
          cheque_date: split.chequeDate,
          bank_name: split.bankName,
          bank_account_code: split.bankAccountCode,
          bank_account_name: split.bankAccountName,
          online_payment_type: split.onlinePaymentType,
          provider_name: split.providerName,
        })),
        bank_account_code: request.bankAccountCode,
        bank_account_name: request.bankAccountName,
        payment_due_date: request.paymentDueDate,
      },
      // The booking flow shows "class full" / price-change errors itself.
      { skipGlobalErrorToast: true },
    );
    return mapBooking(response.data);
  }
}

export const memberBookingsRepository = new ApiMemberBookingsRepository();
