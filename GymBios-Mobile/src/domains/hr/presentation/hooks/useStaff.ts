import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Staff } from '../../domain/Staff';
import type {
  CreateStaffRequest,
  StaffFilters,
  UpdateStaffRequest,
} from '../../application/StaffRepository';

import { StaffService } from '../../application/StaffService';
import { ApiStaffRepository } from '../../infrastructure/ApiStaffRepository';

const repository = new ApiStaffRepository();
const staffService = new StaffService(repository);

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (filters: StaffFilters | undefined) =>
    [...staffKeys.lists(), filters] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
};

export function useStaff(initialFilters?: StaffFilters) {
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [page, setPage] = useState(initialFilters?.page ?? 1);

  const filters = useMemo(() => ({ ...initialFilters, page }), [initialFilters, page]);

  const staffQuery = useQuery({
    queryKey: staffKeys.list(filters),
    queryFn: () => staffService.getStaff(filters),
  });

  const staff = staffQuery.data?.content ?? [];
  const totalPages = staffQuery.data?.totalPages ?? 1;
  const loading = staffQuery.isFetching;
  const error = staffQuery.error as Error | null;

  const refresh = useCallback(() => {
    return staffQuery.refetch();
  }, [staffQuery]);

  const loadStaff = useCallback(
    async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: staffKeys.detail(id),
        queryFn: () => staffService.getStaffById(id),
      });
      setSelectedStaff(result);
      return result;
    },
    [queryClient],
  );

  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();

  const createStaff = useCallback(
    async (request: CreateStaffRequest) => {
      return createStaffMutation.mutateAsync(request);
    },
    [createStaffMutation],
  );

  const updateStaff = useCallback(
    async (id: string, request: UpdateStaffRequest) => {
      const updated = await updateStaffMutation.mutateAsync({ id, request });
      setSelectedStaff((prev) => (prev?.id === id ? updated : prev));
      return updated;
    },
    [updateStaffMutation],
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      await deleteStaffMutation.mutateAsync(id);
      setSelectedStaff((prev) => (prev?.id === id ? null : prev));
    },
    [deleteStaffMutation],
  );

  return {
    staff,
    selectedStaff,
    page,
    totalPages,
    setPage,

    loading,
    submitting:
      createStaffMutation.isPending ||
      updateStaffMutation.isPending ||
      deleteStaffMutation.isPending,
    error,

    refresh,
    loadStaff,
    createStaff,
    updateStaff,
    deleteStaff,
  };
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateStaffRequest) =>
      staffService.createStaff(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: UpdateStaffRequest;
    }) => staffService.updateStaff(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffService.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}