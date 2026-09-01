import { useQuery } from '@tanstack/react-query';
import { ApiFacilityRepository } from '../infrastructure/ApiFacilityRepository';
import type { FacilityFilters } from '../domain/Facility';
import { useBranchContext } from "@/shared/providers/BranchProvider";

const repository = new ApiFacilityRepository();

export const facilityKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilityKeys.all, 'list'] as const,
  list: (filters: FacilityFilters) => [...facilityKeys.lists(), filters] as const,
};

export function useFacilities(filters: FacilityFilters) {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(facilityKeys.list(filters)) ? facilityKeys.list(filters) : [facilityKeys.list(filters)]), selectedBranchId],
    queryFn: () => repository.getFacilities(filters),
  });
}
