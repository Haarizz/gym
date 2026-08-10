import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiFacilityRepository } from '../infrastructure/ApiFacilityRepository';
import type { FacilityRequest } from '../domain/Facility';
import { facilityKeys } from './useFacilities';

const repository = new ApiFacilityRepository();

export function useFacilityActions() {
  const queryClient = useQueryClient();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: facilityKeys.lists() });
  };

  const createFacility = useMutation({
    mutationFn: (request: FacilityRequest) => repository.createFacility(request),
    onSuccess: () => {
      invalidateLists();
    },
  });

  const updateFacility = useMutation({
    mutationFn: ({ id, request }: { id: number; request: FacilityRequest }) =>
      repository.updateFacility(id, request),
    onSuccess: () => {
      invalidateLists();
    },
  });

  const deleteFacility = useMutation({
    mutationFn: (id: number) => repository.deleteFacility(id),
    onSuccess: () => {
      invalidateLists();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (id: number) => repository.toggleStatus(id),
    onSuccess: () => {
      invalidateLists();
    },
  });

  return {
    createFacility,
    updateFacility,
    deleteFacility,
    toggleStatus,
  };
}
