import type { Role } from '../domain/Role';

export interface RoleFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface RolePage {
  data: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RoleRequest {
  roleName: string;
  description: string;
  permissionKeys: string[];
}

export interface RoleRepository {
  listRoles(filters?: RoleFilters): Promise<RolePage>;
  getRole(id: number): Promise<Role>;
  createRole(request: RoleRequest): Promise<Role>;
  updateRole(id: number, request: RoleRequest): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  duplicateRole(id: number): Promise<Role>;
}
