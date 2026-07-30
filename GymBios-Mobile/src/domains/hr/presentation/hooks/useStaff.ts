import { useCallback, useEffect, useMemo, useState } from 'react';

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

export function useStaff(initialFilters?: StaffFilters) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const filters = useMemo(() => initialFilters, [initialFilters]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const page = await staffService.getStaff(filters);
      setStaff(page.content);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStaff = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await staffService.getStaffById(id);
      setSelectedStaff(result);

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStaff = useCallback(
    async (request: CreateStaffRequest) => {
      try {
        setSubmitting(true);
        setError(null);

        const created = await staffService.createStaff(request);

        setStaff(previous => [created, ...previous]);

        return created;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const updateStaff = useCallback(
    async (id: string, request: UpdateStaffRequest) => {
      try {
        setSubmitting(true);
        setError(null);

        const updated = await staffService.updateStaff(id, request);

        setStaff(previous =>
          previous.map(item => (item.id === id ? updated : item)),
        );

        if (selectedStaff?.id === id) {
          setSelectedStaff(updated);
        }

        return updated;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [selectedStaff],
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      try {
        setSubmitting(true);
        setError(null);

        await staffService.deleteStaff(id);

        setStaff(previous =>
          previous.filter(item => item.id !== id),
        );

        if (selectedStaff?.id === id) {
          setSelectedStaff(null);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [selectedStaff],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    staff,
    selectedStaff,

    loading,
    submitting,
    error,

    refresh,
    loadStaff,
    createStaff,
    updateStaff,
    deleteStaff,
  };
}