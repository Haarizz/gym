import type { Role } from '../domain/Role';
import type { RoleRepository, RoleFilters, RolePage, RoleRequest } from '../application/RoleRepository';

import { apiClient } from '@/core/network/apiClient';

interface RoleResponse {
  id: number;
  role_name: string;
  description: string;
  is_system: boolean;
  user_count: number;
  permission_keys: string[];
}

interface RolePageResponse {
  data: RoleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export class ApiRoleRepository implements RoleRepository {
  async listRoles(filters?: RoleFilters): Promise<RolePage> {
    const response = await apiClient.get<RolePageResponse>('/administration/roles', {
      params: filters,
    });
    
    return {
      data: response.data.data.map(item => this.toDomain(item)),
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.total_pages,
      },
    };
  }

  async getRole(id: number): Promise<Role> {
    const response = await apiClient.get<RoleResponse>(`/administration/roles/${id}`);
    return this.toDomain(response.data);
  }

  async createRole(request: RoleRequest): Promise<Role> {
    const payload = {
      role_name: request.roleName,
      description: request.description,
      permission_keys: request.permissionKeys,
    };
    const response = await apiClient.post<RoleResponse>('/administration/roles', payload);
    return this.toDomain(response.data);
  }

  async updateRole(id: number, request: RoleRequest): Promise<Role> {
    const payload = {
      role_name: request.roleName,
      description: request.description,
      permission_keys: request.permissionKeys,
    };
    const response = await apiClient.put<RoleResponse>(`/administration/roles/${id}`, payload);
    return this.toDomain(response.data);
  }

  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`/administration/roles/${id}`);
  }

  async duplicateRole(id: number): Promise<Role> {
    const response = await apiClient.post<RoleResponse>(`/administration/roles/${id}/duplicate`);
    return this.toDomain(response.data);
  }

  private toDomain(response: RoleResponse): Role {
    return {
      id: response.id,
      roleName: response.role_name,
      description: response.description,
      isSystem: response.is_system,
      userCount: response.user_count,
      permissionKeys: response.permission_keys,
    };
  }
}
