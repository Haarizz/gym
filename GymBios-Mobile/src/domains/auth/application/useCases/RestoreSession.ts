import type { Result } from '@/core/types';

import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { AppRole } from '../../domain/valueObjects/AppRole';

export interface RestoreSessionResult {
  session: Session | null;
  pendingRole: AppRole | null;
}

export class RestoreSession {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<Result<RestoreSessionResult, string>> {
    const sessionResult = await this.authRepository.getStoredSession();

    if (!sessionResult.success) {
      return { success: false, error: sessionResult.error };
    }

    const session = sessionResult.value;

    if (!session || session.isExpired()) {
      if (session) {
        await this.authRepository.clearSession();
      }

      const pendingRoleResult = await this.authRepository.getPendingRole();
      const pendingRole =
        pendingRoleResult.success && pendingRoleResult.value ? pendingRoleResult.value.value : null;

      return { success: true, value: { session: null, pendingRole } };
    }

    return { success: true, value: { session, pendingRole: null } };
  }
}
