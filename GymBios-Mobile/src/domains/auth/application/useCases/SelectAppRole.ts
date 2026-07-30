import type { Result } from '@/core/types';

import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { AppRoleValue } from '../../domain/valueObjects/AppRole';
import type { SelectAppRoleDto } from '../dto/LoginDto';

export class SelectAppRole {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: SelectAppRoleDto): Promise<Result<void, string>> {
    const roleResult = AppRoleValue.create(input.role);

    if (!roleResult.success) {
      return roleResult;
    }

    return this.authRepository.persistPendingRole(roleResult.value);
  }
}
