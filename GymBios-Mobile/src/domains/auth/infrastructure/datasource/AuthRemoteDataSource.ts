import { ApiError } from '@/core/platform/api';
import { env } from '@/core/platform/config';
import type { Result } from '@/core/types';

import { Session } from '../../domain/entities/Session';
import { User } from '../../domain/entities/User';
import type { AppRole } from '../../domain/valueObjects/AppRole';
import type { AppRoleValue } from '../../domain/valueObjects/AppRole';
import type { Password } from '../../domain/valueObjects/Password';
import type { Username } from '../../domain/valueObjects/Username';
import { AuthApi } from '../api/AuthApi';
import { mapCredentialsToLoginRequest, mapLoginResponseToSession } from '../mapper/AuthMapper';

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

      return { success: false, error: 'Unable to sign in. Please try again.' };
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

      return { success: false, error: 'Unable to verify session' };
    }
  }

  private mockLogin(
    username: Username,
    password: Password,
    appRole: AppRoleValue,
  ): Result<Session, string> {
    if (password.value !== 'password123') {
      return { success: false, error: 'Invalid username or password' };
    }

    const role = appRole.value;
    const permissions = ROLE_PERMISSIONS[role];

    const session = Session.create({
      accessToken: `mock-access-token-${role}`,
      refreshToken: `mock-refresh-token-${role}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      appRole: role,
      permissions,
      user: User.create({
        id: `usr_mock_${role}`,
        username: username.value,
        email: `${username.value}@gymbios.local`,
        fullName: ROLE_DISPLAY_NAMES[role],
        appRole: role,
        permissions,
      }),
    });

    return { success: true, value: session };
  }
}
