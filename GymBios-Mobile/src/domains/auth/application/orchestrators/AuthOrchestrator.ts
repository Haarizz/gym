import type { Result } from '@/core/types';

import type { Session } from '../../domain/entities/Session';
import type { LoginDto } from '../dto/LoginDto';
import type { SelectAppRoleDto } from '../dto/LoginDto';
import { LoginUser } from '../useCases/LoginUser';
import { LogoutUser } from '../useCases/LogoutUser';
import { SelectAppRole } from '../useCases/SelectAppRole';

export class AuthOrchestrator {
  constructor(
    private readonly selectAppRole: SelectAppRole,
    private readonly loginUser: LoginUser,
    private readonly logoutUser: LogoutUser,
  ) {}

  chooseRole(input: SelectAppRoleDto): Promise<Result<void, string>> {
    return this.selectAppRole.execute(input);
  }

  signIn(input: LoginDto): Promise<Result<Session, string>> {
    return this.loginUser.execute(input);
  }

  signOut(): Promise<Result<void, string>> {
    return this.logoutUser.execute();
  }
}
