/**
 * A submitted registration awaiting email OTP verification. Deliberately not a
 * Session — no account/JWT exists yet, so this carries only the opaque handle
 * needed to verify/resend/check status, never anything session-shaped.
 */
export interface PendingRegistration {
  registrationToken: string;
  maskedEmail: string;
  otpExpiresAt: string;
  resendAvailableAt: string;
  emailDeliveryStatus: string;
  /** TEMPORARY — the raw OTP, shown via toast until real email delivery exists. */
  devOtp?: string;
}

export interface RegistrationStatus {
  status: 'PENDING' | 'ALREADY_VERIFIED' | 'EXPIRED';
  maskedEmail: string;
  otpExpiresAt: string;
  resendAvailableAt: string;
}
