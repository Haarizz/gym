import type { Result } from '@/core/types';

import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class RefreshSession {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(refreshToken: string): Promise<Result<Session, string>> {
    if (!refreshToken.trim()) {
      return { success: false, error: 'Refresh token is required' };
    }

    const refreshResult = await this.authRepository.refreshSession(refreshToken);

    if (!refreshResult.success) {
      return refreshResult;
    }

    const persistResult = await this.authRepository.persistSession(refreshResult.value);

    if (!persistResult.success) {
      return persistResult;
    }

    return refreshResult;
  }
}
