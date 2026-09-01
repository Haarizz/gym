import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TrainerScheduleData, MobileSessionRequestDTO, MobileAvailabilityDTO } from '../domain/TrainerScheduleData';
import { ApiTrainerScheduleRepository } from '../infrastructure/ApiTrainerScheduleRepository';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useBranchContext } from "@/shared/providers/BranchProvider";

export const trainerScheduleKeys = {
  all: ['schedule', 'trainer'] as const,
  dateRange: (start: string, end: string) => [...trainerScheduleKeys.all, start, end] as const,
  availability: ['schedule', 'trainer', 'availability'] as const,
};

export function useTrainerSchedule(startDate: string, endDate: string) {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery({
    queryKey: [...(Array.isArray(trainerScheduleKeys.dateRange(startDate, endDate)) ? trainerScheduleKeys.dateRange(startDate, endDate) : [trainerScheduleKeys.dateRange(startDate, endDate)]), selectedBranchId],
    queryFn: () => ApiTrainerScheduleRepository.getSchedule(startDate, endDate),
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
  };
}

export function useCreateTrainerSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: MobileSessionRequestDTO) => ApiTrainerScheduleRepository.createSession(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}

export function useUpdateTrainerSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, request }: { id: string | number; request: MobileSessionRequestDTO }) => 
      ApiTrainerScheduleRepository.updateSession(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}

export function useDeleteTrainerSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string | number) => ApiTrainerScheduleRepository.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}

export function useTrainerAvailability() {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(trainerScheduleKeys.availability) ? trainerScheduleKeys.availability : [trainerScheduleKeys.availability]), selectedBranchId],
    queryFn: () => ApiTrainerScheduleRepository.getAvailability(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateTrainerAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: MobileAvailabilityDTO) => ApiTrainerScheduleRepository.updateAvailability(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.availability });
    },
  });
}
