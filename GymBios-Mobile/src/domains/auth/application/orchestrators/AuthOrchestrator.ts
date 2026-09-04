import type { Result } from '@/core/types';

import type { Session } from '../../domain/entities/Session';
import type { LoginDto } from '../dto/LoginDto';
import type { SelectAppRoleDto } from '../dto/LoginDto';
import { LoginUser } from '../useCases/LoginUser';
import { LogoutUser } from '../useCases/LogoutUser';
import { RegisterUser, type RegisterUserDto } from '../useCases/RegisterUser';
import { SelectAppRole } from '../useCases/SelectAppRole';

export class AuthOrchestrator {
  constructor(
    private readonly selectAppRole: SelectAppRole,
    private readonly loginUser: LoginUser,
    private readonly logoutUser: LogoutUser,
    private readonly registerUser: RegisterUser,
  ) {}

  chooseRole(input: SelectAppRoleDto): Promise<Result<void, string>> {
    return this.selectAppRole.execute(input);
  }

  signIn(input: LoginDto): Promise<Result<Session, string>> {
    return this.loginUser.execute(input);
  }

  register(input: RegisterUserDto): Promise<Result<Session, string>> {
    return this.registerUser.execute(input);
  }

  signOut(): Promise<Result<void, string>> {
    return this.logoutUser.execute();
  }
}
