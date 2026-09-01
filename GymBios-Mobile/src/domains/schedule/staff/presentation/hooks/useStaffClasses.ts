import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffClassRepository } from '../../infrastructure/ApiStaffClassRepository';
import { ApiStaffRepository } from '../../../../hr/infrastructure/ApiStaffRepository';
import type { MobileStaffSessionRequestDTO } from '../../domain/StaffClassTypes';
import { scheduleKeys } from '../../../hooks/useStaffSchedule';
import { trainerScheduleKeys } from '../../../hooks/useTrainerSchedule';
import { useBranchContext } from '@/shared/providers/BranchProvider';

const staffRepo = new ApiStaffRepository();

export const staffClassesKeys = {
  all: ['schedule', 'staffClasses'] as const,
  trainers: () => [...staffClassesKeys.all, 'trainers'] as const,
};

export function useStaffClassesTrainers() {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...staffClassesKeys.trainers(), selectedBranchId],
    queryFn: async () => {
      const page = await staffRepo.getStaff({ role: 'Trainer' });
      return page.content;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useStaffAllClasses(startDate: string, endDate: string) {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...staffClassesKeys.all, startDate, endDate, selectedBranchId],
    queryFn: () => staffClassRepository.getSessions(startDate, endDate),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateStaffClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: MobileStaffSessionRequestDTO) => staffClassRepository.createClass(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}

export function useUpdateStaffClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: MobileStaffSessionRequestDTO }) => 
      staffClassRepository.updateClass(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}

export function useDeleteStaffClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => staffClassRepository.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: trainerScheduleKeys.all });
    },
  });
}
