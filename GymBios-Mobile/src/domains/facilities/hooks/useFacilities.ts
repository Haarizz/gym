import { useQuery } from '@tanstack/react-query';
import { ApiFacilityRepository } from '../infrastructure/ApiFacilityRepository';
import type { FacilityFilters } from '../domain/Facility';

const repository = new ApiFacilityRepository();

export const facilityKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilityKeys.all, 'list'] as const,
  list: (filters: FacilityFilters) => [...facilityKeys.lists(), filters] as const,
};

export function useFacilities(filters: FacilityFilters) {
  return useQuery({
    queryKey: facilityKeys.list(filters),
    queryFn: () => repository.getFacilities(filters),
  });
}
