import { secureStorage, StorageKeys } from '@/core/platform/storage';
import type { Result } from '@/core/types';

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

  async registerMobileUser(payload: any): Promise<Result<Session, string>> {
    const result = await this.remoteDataSource.registerMobileUser(payload);
    if (result.success) {
      await this.persistSession(result.value);
    }
    return result;
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
