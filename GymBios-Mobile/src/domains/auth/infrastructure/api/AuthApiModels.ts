import type { AppRole } from '../../domain/valueObjects/AppRole';

export interface LoginRequestApiModel {
  username: string;
  password: string;
}

export interface LoginResponseApiModel {
  token: string;
  username: string;
  roles: string[];
  userId: number;
  user_id?: number;
  enabled: boolean;
  staff_name?: string;
  permissions?: string[];
  branchId?: number;
  branch_id?: number;
  defaultBranchId?: number;
  default_branch_id?: number;
  profileCompleted?: boolean;
  profile_completed?: boolean;
  fullName?: string;
  full_name?: string;
}

export type MeResponseApiModel = LoginResponseApiModel;

export interface UserApiModel {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: AppRole;
  permissions: string[];
  branchId?: number;
  profileCompleted?: boolean;
}

// Field names are snake_case to match the backend's global
// spring.jackson.property-naming-strategy=SNAKE_CASE (same convention already
// used by LoginResponseApiModel's user_id/branch_id/profile_completed above,
// and by the register request payload's full_name).
export interface MobileRegisterInitiatedApiModel {
  registration_token: string;
  masked_email: string;
  otp_expires_at: string;
  resend_available_at: string;
  email_delivery_status: string;
  /** TEMPORARY — populated only until real email delivery is wired in. */
  dev_otp?: string;
}

export interface MobileResendOtpApiModel {
  otp_expires_at: string;
  resend_available_at: string;
  /** TEMPORARY — see MobileRegisterInitiatedApiModel.dev_otp. */
  dev_otp?: string;
}

export interface MobileRegistrationStatusApiModel {
  status: 'PENDING' | 'ALREADY_VERIFIED' | 'EXPIRED';
  masked_email: string;
  otp_expires_at: string;
  resend_available_at: string;
}

// ── Social sign-in (Google/Apple) ───────────────────────────────────────────
// Field names are snake_case to match the backend's global SNAKE_CASE naming
// strategy, same convention as the models above.

export interface GoogleAuthRequestApiModel {
  id_token: string;
}

export interface AppleAuthRequestApiModel {
  identity_token: string;
  user?: { full_name?: string | null };
}

export interface SocialCompleteRequestApiModel {
  username: string;
  full_name?: string | null;
}

export interface LinkProviderRequestApiModel {
  token: string;
}

/**
 * Envelope MobileSocialAuthController's /google and /apple endpoints return.
 * Exactly one of the shapes below is populated, selected by `status` — mirrors
 * the backend's MobileSocialAuthResponseDTO.
 */
export interface SocialAuthApiModel {
  status: 'AUTHENTICATED' | 'LINK_REQUIRED' | 'NEEDS_USERNAME';
  session?: LoginResponseApiModel;
  pending_token?: string;
  suggested_username?: string | null;
  prefill_full_name?: string | null;
  masked_email?: string;
  expires_at?: string;
  provider?: 'GOOGLE' | 'APPLE';
}

export interface LinkProviderResponseApiModel {
  status: 'LINKED';
  provider: 'GOOGLE' | 'APPLE';
}

export interface StoredSessionApiModel {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  appRole: AppRole;
  permissions: string[];
  user: UserApiModel;
  branchId?: number;
  profileCompleted?: boolean;
}
