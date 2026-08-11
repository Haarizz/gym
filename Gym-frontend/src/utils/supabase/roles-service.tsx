import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Role {
  id: string;
  role_name: string;
  description?: string;
  is_system: boolean;
  user_count: number;
  permission_keys: string[];
}

export interface RoleRequestData {
  role_name: string;
  description?: string;
  permission_keys: string[];
}

export interface RolePageResponse {
  data: Role[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export interface PermissionItem {
  key: string;
  action: string;
}

export interface PermissionCatalogModule {
  module: string;
  permissions: PermissionItem[];
}

class RolesService {

  async getRoles(search = '', page = 1, limit = 50): Promise<RolePageResponse> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) params.append('search', search);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch roles: ${response.status}`);
    return response.json();
  }

  async getRole(id: string): Promise<Role> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch role: ${response.status}`);
    return response.json();
  }

  async createRole(data: RoleRequestData): Promise<Role> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any)?.message || `Failed to create role: ${response.status}`);
    }
    return response.json();
  }

  async updateRole(id: string, data: Partial<RoleRequestData>): Promise<Role> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any)?.message || `Failed to update role: ${response.status}`);
    }
    return response.json();
  }

  async deleteRole(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any)?.message || `Failed to delete role: ${response.status}`);
    }
  }

  async duplicateRole(id: string): Promise<Role> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/roles/${id}/duplicate`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as any)?.message || `Failed to duplicate role: ${response.status}`);
    }
    return response.json();
  }

  async getPermissionCatalog(): Promise<PermissionCatalogModule[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/administration/permissions`
    );
    if (!response.ok) throw new Error(`Failed to fetch permission catalog: ${response.status}`);
    return response.json();
  }
}

export const rolesService = new RolesService();
