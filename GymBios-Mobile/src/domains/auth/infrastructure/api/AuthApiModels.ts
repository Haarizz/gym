import type { AppRole } from '../../domain/valueObjects/AppRole';

export interface LoginRequestApiModel {
  username: string;
  password: string;
}

export interface LoginResponseApiModel {
  token: string;
  username: string;
  roles: string[];
  userId: number;
  enabled: boolean;
  staff_name?: string;
  permissions?: string[];
  branchId?: number;
  branch_id?: number;
}

export type MeResponseApiModel = LoginResponseApiModel;

export interface UserApiModel {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: AppRole;
  permissions: string[];
  branchId?: number;
}

export interface StoredSessionApiModel {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  appRole: AppRole;
  permissions: string[];
  user: UserApiModel;
  branchId?: number;
}
