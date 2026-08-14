import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Role } from '../domain/Role';
import type { RoleFilters } from '../application/RoleRepository';

import { RoleService } from '../application/RoleService';
import { ApiRoleRepository } from '../infrastructure/ApiRoleRepository';

const repository = new ApiRoleRepository();
const roleService = new RoleService(repository);

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: RoleFilters | undefined) => [...roleKeys.lists(), filters] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
};

export function useRoles(initialFilters?: RoleFilters) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [page, setPage] = useState(1);

  const filters = useMemo(() => initialFilters, [initialFilters]);

  const rolesQuery = useQuery({
    queryKey: roleKeys.list({ ...filters, page }),
    queryFn: () => roleService.listRoles({ ...filters, page }),
  });

  const roles = rolesQuery.data?.data ?? [];
  const totalPages = rolesQuery.data?.pagination.totalPages ?? 1;
  const totalElements = rolesQuery.data?.pagination.total ?? 0;
  const loading = rolesQuery.isFetching;
  const error = rolesQuery.error as Error | null;

  const refresh = useCallback(() => {
    return rolesQuery.refetch();
  }, [rolesQuery]);

  const loadRole = useCallback(
    async (id: number) => {
      const result = await queryClient.fetchQuery({
        queryKey: roleKeys.detail(id),
        queryFn: () => roleService.getRole(id),
      });
      setSelectedRole(result);
      return result;
    },
    [queryClient],
  );

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    roles,
    selectedRole,

    loading,
    submitting: false,
    error,

    page,
    totalPages,
    totalElements,

    refresh,
    loadRole,
    goToPage,
  };
}

export function useRolesList(filters?: RoleFilters) {
  return useQuery({
    queryKey: roleKeys.list(filters),
    queryFn: () => roleService.listRoles(filters),
  });
}
