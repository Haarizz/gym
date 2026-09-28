import type { Result } from '@/core/types';

import type { PendingRegistration, RegistrationStatus } from '../entities/PendingRegistration';
import type { PendingSocialRegistration } from '../entities/PendingSocialRegistration';
import type { Session } from '../entities/Session';
import type { SocialAuthOutcome, SocialProvider } from '../entities/SocialAuthOutcome';
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

  /** Provider validation only — no session/pending row is created unless the outcome demands it. */
  authenticateWithGoogle(idToken: string): Promise<Result<SocialAuthOutcome, string>>;
  /** fullNameHint is Apple's client-submitted, unverified name hint — see SocialAuthOutcome. */
  authenticateWithApple(identityToken: string, fullNameHint: string | null): Promise<Result<SocialAuthOutcome, string>>;
  completeSocialRegistration(
    provider: SocialProvider,
    pendingToken: string,
    username: string,
    fullName: string | null,
  ): Promise<Result<Session, string>>;
  /** Requires an existing, recently-issued session — see LinkProvider use case. */
  linkProvider(provider: SocialProvider, providerToken: string): Promise<Result<void, string>>;

  persistPendingSocialRegistration(pending: PendingSocialRegistration): Promise<Result<void, string>>;
  getStoredPendingSocialRegistration(): Promise<Result<PendingSocialRegistration | null, string>>;
  clearPendingSocialRegistration(): Promise<Result<void, string>>;
}
