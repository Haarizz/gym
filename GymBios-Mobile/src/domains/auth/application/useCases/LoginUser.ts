import type { Result } from '@/core/types';

import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { AppRoleValue } from '../../domain/valueObjects/AppRole';
import { Password } from '../../domain/valueObjects/Password';
import { Username } from '../../domain/valueObjects/Username';
import type { LoginDto } from '../dto/LoginDto';

export class LoginUser {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: LoginDto): Promise<Result<Session, string>> {
    const usernameResult = Username.create(input.username);

    if (!usernameResult.success) {
      return usernameResult;
    }

    const passwordResult = Password.create(input.password);

    if (!passwordResult.success) {
      return passwordResult;
    }

    const roleResult = AppRoleValue.create(input.role);

    if (!roleResult.success) {
      return roleResult;
    }

    const sessionResult = await this.authRepository.login(
      usernameResult.value,
      passwordResult.value,
      roleResult.value,
    );

    if (!sessionResult.success) {
      return sessionResult;
    }

    const persistResult = await this.authRepository.persistSession(sessionResult.value);

    if (!persistResult.success) {
      return persistResult;
    }

    await this.authRepository.clearPendingRole();

    return sessionResult;
  }
}
