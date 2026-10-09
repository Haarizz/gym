import type { PaymentSplit } from '@/shared/payment/types';

/** null = free | paid | partial (Credit/part payment) | pending (awaiting staff approval). */
export type BookingPaymentStatus = 'paid' | 'partial' | 'pending' | null;

/** REFUNDED | NOT_REFUNDABLE (cancelled within 2h) | VOIDED (cancelled before payment approval). */
export type BookingRefundStatus = 'REFUNDED' | 'NOT_REFUNDABLE' | 'VOIDED' | null;

/** How a cancelled booking's payment is returned. DIRECT needs a payment gateway (coming soon). */
export type RefundMethod = 'WALLET' | 'DIRECT';

export interface MemberBookingData {
  id: number;
  classId: number;
  className: string;
  type: SessionType | null;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  status: string;
  capacity: number | null;
  /** null = unlimited seats. */
  availableSpots: number | null;
  canCancel: boolean;

  // Payment
  price: number | null;
  grossPrice: number | null;
  discountAmount: number | null;
  discountLabel: string | null;
  walletAmount: number | null;
  paymentStatus: BookingPaymentStatus;
  receiptId: number | null;

  // Cancellation / refund
  /** Gym-local ISO date-time (no zone) after which cancelling isn't refunded. */
  refundDeadline: string | null;
  refundableIfCancelledNow: boolean;
  refundStatus: BookingRefundStatus;
  refundMethod: RefundMethod | null;
  refundedAmount: number | null;
  cancelledBy: 'MEMBER' | 'STAFF' | null;
}

export interface BookingStatsData {
  upcoming: number;
  thisWeek: number;
  attended: number;
}

export type SessionType = 'class' | 'pt' | 'facility';

export interface AvailableClassData {
  classId: number;
  className: string;
  type: SessionType;
  trainerName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  capacity: number | null;
  /** null = unlimited seats. */
  availableSpots: number | null;
  memberBookingState: string | null;
  /** null or 0 = free. */
  price: number | null;
  /** Gym-local ISO date-time (no zone) after which a cancellation isn't refunded. */
  refundDeadline: string | null;
  /** False when the session starts within the refund cutoff — a booking made now can't be refunded. */
  refundableIfBookedNow: boolean;
}

export interface CreateMemberBookingRequest {
  classId: number;
  // A Free PT / Class Reward Pass that pays for this booking.
  rewardPassId?: number;
  // A promotion or referral coupon code (instead of a pass).
  couponCode?: string;
  // Part of the price paid from the wallet.
  walletAmount?: number;
  // The total shown to the member (after code/pass, before wallet); the server refuses a mismatch.
  expectedAmount?: number;
  paymentMethodUsed?: string;
  paymentBreakdown?: PaymentSplit[];
  bankAccountCode?: string;
  bankAccountName?: string;
  paymentDueDate?: string;
}
