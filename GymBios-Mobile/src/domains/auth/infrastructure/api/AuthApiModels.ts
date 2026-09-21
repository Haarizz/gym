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
