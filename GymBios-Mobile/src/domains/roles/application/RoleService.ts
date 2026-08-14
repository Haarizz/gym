import type { Role } from '../domain/Role';
import type { RoleRepository, RoleFilters, RolePage, RoleRequest } from './RoleRepository';

export class RoleService {
  constructor(private readonly repository: RoleRepository) {}

  async listRoles(filters?: RoleFilters): Promise<RolePage> {
    return this.repository.listRoles(filters);
  }

  async getRole(id: number): Promise<Role> {
    return this.repository.getRole(id);
  }

  async createRole(request: RoleRequest): Promise<Role> {
    return this.repository.createRole(request);
  }

  async updateRole(id: number, request: RoleRequest): Promise<Role> {
    // The backend enforces protection for system roles.
    return this.repository.updateRole(id, request);
  }

  async deleteRole(id: number): Promise<void> {
    return this.repository.deleteRole(id);
  }

  async duplicateRole(id: number): Promise<Role> {
    // Duplicating a system role creates a custom role via backend.
    return this.repository.duplicateRole(id);
  }
}
