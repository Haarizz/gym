import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Member } from '../domain/Member';
import type { MemberFilters } from '../application/directory/MemberDirectoryRepository';

import { MemberDirectoryService } from '../application/directory/MemberDirectoryService';
import { ApiMemberDirectoryRepository } from '../infrastructure/directory/ApiMemberDirectoryRepository';

const repository = new ApiMemberDirectoryRepository();
const directoryService = new MemberDirectoryService(repository);

export function useMembers(initialFilters?: MemberFilters) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const filters = useMemo(() => initialFilters, [initialFilters]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await directoryService.getMembers({
        ...filters,
        page,
      });
      setMembers(result.content);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadMember = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const result = await directoryService.getMember(id);
      setSelectedMember(result);

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentMember = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await directoryService.getCurrentMember();
      setSelectedMember(result);

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMemberByUser = useCallback(async (userId: number) => {
    try {
      setLoading(true);
      setError(null);

      const result = await directoryService.getMemberByUser(userId);
      setSelectedMember(result);

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    members,
    selectedMember,

    loading,
    submitting,
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