import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Role } from '../domain/Role';
import type { RoleRequest } from '../application/RoleRepository';

import { RoleService } from '../application/RoleService';
import { ApiRoleRepository } from '../infrastructure/ApiRoleRepository';
import { roleKeys } from './useRoles';

const repository = new ApiRoleRepository();
const roleService = new RoleService(repository);

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleRequest) => roleService.createRole(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: RoleRequest }) =>
      roleService.updateRole(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useDuplicateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => roleService.duplicateRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useRoleActions() {
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const duplicateRoleMutation = useDuplicateRole();

  const submitting =
    createRoleMutation.isPending ||
    updateRoleMutation.isPending ||
    deleteRoleMutation.isPending ||
    duplicateRoleMutation.isPending;

  const error =
    (createRoleMutation.error ??
      updateRoleMutation.error ??
      deleteRoleMutation.error ??
      duplicateRoleMutation.error) as Error | null;

  const createRole = useCallback(
    async (request: RoleRequest): Promise<Role> => {
      return createRoleMutation.mutateAsync(request);
    },
    [createRoleMutation],
  );

  const updateRole = useCallback(
    async (id: number, request: RoleRequest): Promise<Role> => {
      return updateRoleMutation.mutateAsync({ id, request });
    },
    [updateRoleMutation],
  );

  const deleteRole = useCallback(
    async (id: number): Promise<void> => {
      await deleteRoleMutation.mutateAsync(id);
    },
    [deleteRoleMutation],
  );

  const duplicateRole = useCallback(
    async (id: number): Promise<Role> => {
      return duplicateRoleMutation.mutateAsync(id);
    },
    [duplicateRoleMutation],
  );

  return {
    submitting,
    error,
    createRole,
    updateRole,
    deleteRole,
    duplicateRole,
  };
}
