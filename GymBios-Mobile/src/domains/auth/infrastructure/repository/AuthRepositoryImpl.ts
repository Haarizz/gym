import { secureStorage, StorageKeys } from '@/core/platform/storage';
import type { Result } from '@/core/types';

import type { PendingRegistration, RegistrationStatus } from '../../domain/entities/PendingRegistration';
import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { AppRoleValue } from '../../domain/valueObjects/AppRole';
import type { AppRoleValue as AppRoleValueType } from '../../domain/valueObjects/AppRole';
import type { Password } from '../../domain/valueObjects/Password';
import type { Username } from '../../domain/valueObjects/Username';
import type { StoredSessionApiModel } from '../api/AuthApiModels';
import { AuthRemoteDataSource } from '../datasource/AuthRemoteDataSource';
import { mapSessionToStored, mapStoredToSession } from '../mapper/AuthMapper';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(private readonly remoteDataSource: AuthRemoteDataSource) {}

  login(
    username: Username,
    password: Password,
    appRole: AppRoleValueType,
  ): Promise<Result<Session, string>> {
    return this.remoteDataSource.login(username, password, appRole);
  }

  logout(): Promise<Result<void, string>> {
    return this.remoteDataSource.logout();
  }

  async refreshSession(refreshToken: string): Promise<Result<Session, string>> {
    const result = await this.remoteDataSource.refreshSession(refreshToken);
    if (result.success) {
      await this.persistSession(result.value);
    }
    return result;
  }

  async registerMobileUser(payload: any): Promise<Result<PendingRegistration, string>> {
    // No session is created here — only a pending-registration handle. A JWT
    // only ever exists once verifyOtp succeeds (see that method below).
    const result = await this.remoteDataSource.registerMobileUser(payload);
    if (result.success) {
      await this.persistPendingRegistration(result.value);
    }
    return result;
  }

  async verifyOtp(registrationToken: string, otp: string): Promise<Result<Session, string>> {
    const result = await this.remoteDataSource.verifyOtp(registrationToken, otp);
    if (result.success) {
      await this.persistSession(result.value);
      await this.clearPendingRegistration();
    }
    return result;
  }

  async resendOtp(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>> {
    const result = await this.remoteDataSource.resendOtp(registrationToken);
    if (result.success) {
      const stored = await this.getStoredPendingRegistration();
      if (stored.success && stored.value) {
        await this.persistPendingRegistration({ ...stored.value, ...result.value });
      }
    }
    return result;
  }

  getRegistrationStatus(registrationToken: string): Promise<Result<RegistrationStatus, string>> {
    return this.remoteDataSource.getRegistrationStatus(registrationToken);
  }

  async persistPendingRegistration(pending: PendingRegistration): Promise<Result<void, string>> {
    try {
      await secureStorage.setItem(StorageKeys.pendingRegistration, JSON.stringify(pending));
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to store pending registration' };
    }
  }

  async getStoredPendingRegistration(): Promise<Result<PendingRegistration | null, string>> {
    try {
      const raw = await secureStorage.getItem(StorageKeys.pendingRegistration);
      if (!raw) {
        return { success: true, value: null };
      }
      return { success: true, value: JSON.parse(raw) as PendingRegistration };
    } catch {
      return { success: false, error: 'Failed to read pending registration' };
    }
  }

  async clearPendingRegistration(): Promise<Result<void, string>> {
    try {
      await secureStorage.removeItem(StorageKeys.pendingRegistration);
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to clear pending registration' };
    }
  }

  async getStoredSession(): Promise<Result<Session | null, string>> {
    try {
      const raw = await secureStorage.getItem(StorageKeys.currentUser);

      if (!raw) {
        return { success: true, value: null };
      }

      const stored = JSON.parse(raw) as StoredSessionApiModel;
      return { success: true, value: mapStoredToSession(stored) };
    } catch {
      return { success: false, error: 'Failed to read stored session' };
    }
  }

  async persistSession(session: Session): Promise<Result<void, string>> {
    try {
      await secureStorage.setItem(StorageKeys.accessToken, session.accessToken);
      await secureStorage.setItem(StorageKeys.refreshToken, session.refreshToken);
      await secureStorage.setItem(
        StorageKeys.currentUser,
        JSON.stringify(mapSessionToStored(session)),
      );
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to persist session' };
    }
  }

  async clearSession(): Promise<Result<void, string>> {
    try {
      await secureStorage.removeItem(StorageKeys.accessToken);
      await secureStorage.removeItem(StorageKeys.refreshToken);
      await secureStorage.removeItem(StorageKeys.currentUser);
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to clear session' };
    }
  }

  async persistPendingRole(appRole: AppRoleValueType): Promise<Result<void, string>> {
    try {
      await secureStorage.setItem(StorageKeys.pendingRole, appRole.value);
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to store selected role' };
    }
  }

  async getPendingRole(): Promise<Result<AppRoleValueType | null, string>> {
    try {
      const raw = await secureStorage.getItem(StorageKeys.pendingRole);

      if (!raw) {
        return { success: true, value: null };
      }

      const roleResult = AppRoleValue.create(raw);

      if (!roleResult.success) {
        return { success: false, error: roleResult.error };
      }

      return { success: true, value: roleResult.value };
    } catch {
      return { success: false, error: 'Failed to read selected role' };
    }
  }

  async clearPendingRole(): Promise<Result<void, string>> {
    try {
      await secureStorage.removeItem(StorageKeys.pendingRole);
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: 'Failed to clear selected role' };
    }
  }
}
