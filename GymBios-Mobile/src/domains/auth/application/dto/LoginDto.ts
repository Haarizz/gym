import type { AppRole } from '../../domain/valueObjects/AppRole';

export interface LoginDto {
  readonly username: string;
  readonly password: string;
  readonly role: AppRole;
}

export interface SelectAppRoleDto {
  readonly role: AppRole;
}
