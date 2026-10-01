import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';
import { followUpKeys } from '@/domains/followUps/hooks/followUpKeys';
import { scheduleKeys } from '@/domains/schedule/hooks/useStaffSchedule';
import { staffLeadRepository, CreateMobileStaffLeadRequestDTO } from '../infrastructure/ApiStaffLeadRepository';

export function useAddLead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateMobileStaffLeadRequestDTO) =>
      staffLeadRepository.createLeadAndFollowUp(data),
    onSuccess: () => {
      // Creating a lead also creates its first follow-up.
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: followUpKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.staff() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.staff() });
    },
  });

  return {
    addLead: mutation.mutateAsync,
    isAdding: mutation.isPending,
    error: mutation.error,
  };
}
