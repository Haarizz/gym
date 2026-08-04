import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Member } from '../domain/Member';
import type { MemberFilters } from '../application/directory/MemberDirectoryRepository';

import { MemberDirectoryService } from '../application/directory/MemberDirectoryService';
import { ApiMemberDirectoryRepository } from '../infrastructure/directory/ApiMemberDirectoryRepository';

const repository = new ApiMemberDirectoryRepository();
const directoryService = new MemberDirectoryService(repository);

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: MemberFilters | undefined) =>
    [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
  current: () => [...memberKeys.details(), 'current'] as const,
  byUser: (userId: number) => [...memberKeys.details(), 'user', userId] as const,
};

export function useMembers(initialFilters?: MemberFilters) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [page, setPage] = useState(1);

  const filters = useMemo(() => initialFilters, [initialFilters]);

  const membersQuery = useQuery({
    queryKey: memberKeys.list({ ...filters, page }),
    queryFn: () => directoryService.getMembers({ ...filters, page }),
  });

  const members = membersQuery.data?.content ?? [];
  const totalPages = membersQuery.data?.totalPages ?? 1;
  const totalElements = membersQuery.data?.totalElements ?? 0;
  const loading = membersQuery.isFetching;
  const error = membersQuery.error as Error | null;

  const refresh = useCallback(() => {
    return membersQuery.refetch();
  }, [membersQuery]);

  const loadMember = useCallback(
    async (id: number) => {
      const result = await queryClient.fetchQuery({
        queryKey: memberKeys.detail(id),
        queryFn: () => directoryService.getMember(id),
      });
      setSelectedMember(result);
      return result;
    },
    [queryClient],
  );

  const loadCurrentMember = useCallback(async () => {
    const result = await queryClient.fetchQuery({
      queryKey: memberKeys.current(),
      queryFn: () => directoryService.getCurrentMember(),
    });
    setSelectedMember(result);
    return result;
  }, [queryClient]);

  const loadMemberByUser = useCallback(
    async (userId: number) => {
      const result = await queryClient.fetchQuery({
        queryKey: memberKeys.byUser(userId),
        queryFn: () => directoryService.getMemberByUser(userId),
      });
      setSelectedMember(result);
      return result;
    },
    [queryClient],
  );

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    members,
    selectedMember,

    loading,
    submitting: false,
    error,

    page,
    totalPages,
    totalElements,

    refresh,
    loadMember,
    loadCurrentMember,
    loadMemberByUser,
    goToPage,
  };
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Parameters<typeof directoryService.createMember>[0]) =>
      directoryService.createMember(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: Parameters<typeof directoryService.updateMember>[1];
    }) => directoryService.updateMember(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => directoryService.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}