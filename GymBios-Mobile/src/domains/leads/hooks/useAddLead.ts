import { useMutation, useQueryClient } from '@tanstack/react-query';
import { staffLeadRepository, CreateMobileStaffLeadRequestDTO } from '../infrastructure/ApiStaffLeadRepository';

export function useAddLead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateMobileStaffLeadRequestDTO) =>
      staffLeadRepository.createLeadAndFollowUp(data),
    onSuccess: () => {
      // Invalidate relevant queries, e.g., leads list or dashboard stats
      // if those queries exist in the app.
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['staffDashboard'] });
    },
  });

  return {
    addLead: mutation.mutateAsync,
    isAdding: mutation.isPending,
    error: mutation.error,
  };
}
