import type { Result } from '@/core/types';

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
}
