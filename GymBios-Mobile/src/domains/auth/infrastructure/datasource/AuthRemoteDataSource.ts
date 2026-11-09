import { ApiError } from '@/core/platform/api';
import { env } from '@/core/platform/config';
import type { Result } from '@/core/types';
import { i18n } from '@/core/i18n';

import { Session } from '../../domain/entities/Session';
import { User } from '../../domain/entities/User';
import type { PendingRegistration, RegistrationStatus } from '../../domain/entities/PendingRegistration';
import type { SocialAuthOutcome } from '../../domain/entities/SocialAuthOutcome';
import type { AppRole } from '../../domain/valueObjects/AppRole';
import type { AppRoleValue } from '../../domain/valueObjects/AppRole';
import type { Password } from '../../domain/valueObjects/Password';
import type { Username } from '../../domain/valueObjects/Username';
import { AuthApi } from '../api/AuthApi';
import {
  mapCredentialsToLoginRequest,
  mapIdentityTokenToAppleAuthRequest,
  mapIdTokenToGoogleAuthRequest,
  mapInitiatedResponseToPendingRegistration,
  mapLoginResponseToSession,
  mapRegistrationStatusResponse,
  mapResendResponseToPendingRegistrationUpdate,
  mapSocialAuthResponseToOutcome,
  mapToLinkProviderRequest,
  mapToSocialCompleteRequest,
} from '../mapper/AuthMapper';

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['dashboard:read', 'staff:read', 'deals:read', 'analytics:read'],
  member: ['home:read', 'bookings:read', 'centers:read', 'membership:read', 'profile:read'],
  trainer: ['home:read', 'schedule:read', 'performance:read', 'ledger:read', 'profile:read'],
  staff: ['home:read', 'performance:read', 'schedule:read', 'ledger:read', 'profile:read'],
};

const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: 'GymBios Admin',
  member: 'GymBios Member',
  trainer: 'GymBios Trainer',
  staff: 'GymBios Staff',
};

export class AuthRemoteDataSource {
  constructor(private readonly authApi: AuthApi) { }

  async login(
    username: Username,
    password: Password,
    appRole: AppRoleValue,
  ): Promise<Result<Session, string>> {
    if (env.useMockApi) {
      return this.mockLogin(username, password, appRole);
    }

    try {
      const response = await this.authApi.login(
        mapCredentialsToLoginRequest(username, password),
      );
      return { success: true, value: mapLoginResponseToSession(response.data, appRole.value) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }

      return { success: false, error: i18n.t('auth.errors.unableToSignIn') };
    }
  }

  async logout(): Promise<Result<void, string>> {
    // Spring Boot JWT auth is stateless on server. Clearing client storage signs out the user.
    return { success: true, value: undefined };
  }

  async refreshSession(_refreshToken: string): Promise<Result<Session, string>> {
    if (env.useMockApi) {
      return { success: false, error: 'Mock refresh is not supported' };
    }

    try {
      const response = await this.authApi.getCurrentUser();
      return { success: true, value: mapLoginResponseToSession(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }

      return { success: false, error: i18n.t('auth.errors.unableToVerifySession') };
    }
  }

  async registerMobileUser(payload: any): Promise<Result<PendingRegistration, string>> {
    if (env.useMockApi) {
      return { success: false, error: 'Mock register is not supported' };
    }

    try {
      const apiPayload = {
        full_name: payload.fullName,
        username: payload.username,
        email: payload.email,
        password: payload.password,
      };
      const response = await this.authApi.registerMobileUser(apiPayload);
      return { success: true, value: mapInitiatedResponseToPendingRegistration(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToRegister') };
    }
  }

  async verifyOtp(registrationToken: string, otp: string): Promise<Result<Session, string>> {
    try {
      const response = await this.authApi.verifyOtp(registrationToken, otp);
      return { success: true, value: mapLoginResponseToSession(response.data, 'member') };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToVerifyCode') };
    }
  }

  async resendOtp(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>> {
    try {
      const response = await this.authApi.resendOtp(registrationToken);
      return { success: true, value: mapResendResponseToPendingRegistrationUpdate(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToResendCode') };
    }
  }

  async getRegistrationStatus(registrationToken: string): Promise<Result<RegistrationStatus, string>> {
    try {
      const response = await this.authApi.getRegistrationStatus(registrationToken);
      return { success: true, value: mapRegistrationStatusResponse(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToCheckRegStatus') };
    }
  }

  async authenticateWithGoogle(idToken: string): Promise<Result<SocialAuthOutcome, string>> {
    try {
      const response = await this.authApi.googleAuth(mapIdTokenToGoogleAuthRequest(idToken));
      return { success: true, value: mapSocialAuthResponseToOutcome(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.googleFailed') };
    }
  }

  async authenticateWithApple(
    identityToken: string,
    fullNameHint: string | null,
  ): Promise<Result<SocialAuthOutcome, string>> {
    try {
      const response = await this.authApi.appleAuth(mapIdentityTokenToAppleAuthRequest(identityToken, fullNameHint));
      return { success: true, value: mapSocialAuthResponseToOutcome(response.data) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.appleFailed') };
    }
  }

  async completeSocialRegistration(
    provider: 'GOOGLE' | 'APPLE',
    pendingToken: string,
    username: string,
    fullName: string | null,
  ): Promise<Result<Session, string>> {
    try {
      const payload = mapToSocialCompleteRequest(username, fullName);
      const response =
        provider === 'GOOGLE'
          ? await this.authApi.completeGoogleRegistration(pendingToken, payload)
          : await this.authApi.completeAppleRegistration(pendingToken, payload);
      return { success: true, value: mapLoginResponseToSession(response.data, 'member') };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToFinishAccount') };
    }
  }

  async linkProvider(provider: 'GOOGLE' | 'APPLE', providerToken: string): Promise<Result<void, string>> {
    try {
      await this.authApi.linkProvider(provider, mapToLinkProviderRequest(providerToken));
      return { success: true, value: undefined };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: i18n.t('auth.errors.unableToLinkAccount') };
    }
  }

  private mockLogin(
    username: Username,
    password: Password,
    appRole: AppRoleValue,
  ): Result<Session, string> {
    if (password.value !== 'password123') {
      return { success: false, error: i18n.t('auth.errors.invalidCredentials') };
    }

    const role = appRole.value;
    const permissions = ROLE_PERMISSIONS[role];

    const session = Session.create({
      accessToken: `mock-access-token-${role}`,
      refreshToken: `mock-refresh-token-${role}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      appRole: role,
      permissions: ['read', 'write'],
      profileCompleted: true,
      user: User.create({
        id: `usr_mock_${role}`,
        username: username.value,
        email: `mock_${role}@example.com`,
        fullName: `Mock ${role}`,
        appRole: role,
        permissions,
        profileCompleted: true,
      }),
    });

    return { success: true, value: session };
  }
}
