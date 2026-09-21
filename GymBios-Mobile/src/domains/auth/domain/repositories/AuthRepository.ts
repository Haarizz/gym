import type { Result } from '@/core/types';

import type { PendingRegistration, RegistrationStatus } from '../entities/PendingRegistration';
import type { Session } from '../entities/Session';
import type { AppRoleValue } from '../valueObjects/AppRole';
import type { Password } from '../valueObjects/Password';
import type { Username } from '../valueObjects/Username';

export interface AuthRepository {
  login(
    username: Username,
    password: Password,
    appRole: AppRoleValue,
  ): Promise<Result<Session, string>>;
  logout(): Promise<Result<void, string>>;
  getStoredSession(): Promise<Result<Session | null, string>>;
  persistSession(session: Session): Promise<Result<void, string>>;
  clearSession(): Promise<Result<void, string>>;
  persistPendingRole(appRole: AppRoleValue): Promise<Result<void, string>>;
  getPendingRole(): Promise<Result<AppRoleValue | null, string>>;
  clearPendingRole(): Promise<Result<void, string>>;
  refreshSession(refreshToken: string): Promise<Result<Session, string>>;

  /** Submits the registration form. No account/session exists until verifyOtp succeeds. */
  registerMobileUser(payload: any): Promise<Result<PendingRegistration, string>>;
  verifyOtp(registrationToken: string, otp: string): Promise<Result<Session, string>>;
  resendOtp(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>>;
  getRegistrationStatus(registrationToken: string): Promise<Result<RegistrationStatus, string>>;

  persistPendingRegistration(pending: PendingRegistration): Promise<Result<void, string>>;
  getStoredPendingRegistration(): Promise<Result<PendingRegistration | null, string>>;
  clearPendingRegistration(): Promise<Result<void, string>>;
}
