import { useQuery } from '@tanstack/react-query';

import type { StaffTargetFilters } from '../domain/StaffTarget';
import { StaffService } from '../application/StaffService';
import { ApiStaffRepository } from '../infrastructure/ApiStaffRepository';

const repository = new ApiStaffRepository();
const staffService = new StaffService(repository);

export const staffTargetKeys = {
  all: ['staff', 'targets'] as const,
  list: (filters?: StaffTargetFilters) =>
    [...staffTargetKeys.all, filters] as const,
};

export function useStaffTargets(filters?: StaffTargetFilters) {
  return useQuery({
    queryKey: staffTargetKeys.list(filters),
    queryFn: () => staffService.getTargets(filters),
  });
}
