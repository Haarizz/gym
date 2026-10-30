import { apiClient } from '@/core/network/apiClient';
import { env } from '@/core/platform/config/env';
import type { PaymentResult } from '@/shared/payment/types';

/** A visitor who signed up with the walk-in QR and is waiting for staff to take payment. */
export interface PendingWalkInRegistration {
  id: number;
  name: string;
  phone: string;
  email?: string;
  planId?: number;
  planName?: string;
  referredByStaffId?: number;
  referredByStaffName?: string;
  createdAt: string;
}

export interface MyWalkInLink {
  /** Full URL — personal (?s=code) for staff, so sign-ups through it count toward their target. */
  url: string;
  staffName?: string;
  branchName?: string;
  enabled: boolean;
}

export interface WalkInPaymentRequest {
  name: string;
  phone: string;
  planName: string;
  payment: PaymentResult;
  processedByStaffId?: number;
  selfRegistrationId?: number;
}

interface PendingDTO {
  id: number;
  name: string;
  phone: string;
  email?: string;
  plan_id?: number;
  plan_name?: string;
  referred_by_staff_id?: number;
  referred_by_staff_name?: string;
  created_at: string;
}

interface MyLinkDTO {
  path: string;
  branch_path: string;
  staff_name?: string;
  branch_name?: string;
  enabled: boolean;
}

// The public walk-in page is served by the web app, which shares the API's origin.
const webOrigin = env.apiBaseUrl.replace(/\/api\/?$/, '');

export const walkInApi = {
  /**
   * Same endpoint the web desk uses: records the visit and its Daily Entry receipt,
   * and confirms the visitor's self-registration when one is given.
   */
  async checkIn(request: WalkInPaymentRequest): Promise<{ attendanceId?: number }> {
    const { payment } = request;
    const nonCredit = payment.paymentBreakdown.filter((leg) => leg.method.toLowerCase() !== 'credit');
    const response = await apiClient.post<{ attendance_id?: number }>('/attendance/walkin', {
      name: request.name,
      phone: request.phone,
      session_type: request.planName,
      amount: payment.summary.finalAmount,
      paid_amount: Math.min(payment.summary.paidAmount, payment.summary.finalAmount),
      payment_method: payment.paymentMethodUsed,
      // Mixed legs, or a Stripe payment the backend must verify.
      payment_breakdown: nonCredit.length > 1 || nonCredit.some((leg) => leg.stripePaymentIntentId)
        ? nonCredit.map((leg) => ({
            method: leg.method,
            amount: leg.amount,
            reference: leg.reference,
            card_type: leg.cardType,
            cheque_number: leg.chequeNumber,
            cheque_date: leg.chequeDate,
            bank_name: leg.bankName,
            bank_account_code: leg.bankAccountCode,
            bank_account_name: leg.bankAccountName,
            online_payment_type: leg.onlinePaymentType,
            provider_name: leg.providerName,
            stripe_payment_intent_id: leg.stripePaymentIntentId,
          }))
        : undefined,
      bank_account_code: payment.bankAccountCode,
      bank_account_name: payment.bankAccountName,
      device_id: 'MOBILE',
      processed_by_staff_id: request.processedByStaffId,
      self_registration_id: request.selfRegistrationId,
    });
    return { attendanceId: response.data.attendance_id };
  },

  async listPending(): Promise<PendingWalkInRegistration[]> {
    const response = await apiClient.get<PendingDTO[]>('/attendance/walkin-registrations');
    return response.data.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      planId: r.plan_id,
      planName: r.plan_name,
      referredByStaffId: r.referred_by_staff_id,
      referredByStaffName: r.referred_by_staff_name,
      createdAt: r.created_at,
    }));
  },

  async dismiss(id: number): Promise<void> {
    await apiClient.post(`/attendance/walkin-registrations/${id}/dismiss`);
  },

  async myLink(): Promise<MyWalkInLink> {
    const response = await apiClient.get<MyLinkDTO>('/attendance/walkin/my-link');
    return {
      url: `${webOrigin}${response.data.path}`,
      staffName: response.data.staff_name,
      branchName: response.data.branch_name,
      enabled: response.data.enabled,
    };
  },
};
