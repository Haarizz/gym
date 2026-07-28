import type { Result } from '@/core/types';

import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class LogoutUser {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<Result<void, string>> {
    const clearResult = await this.authRepository.clearSession();

    if (!clearResult.success) {
      return clearResult;
    }

    return this.authRepository.logout();
  }
}
