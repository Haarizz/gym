import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/shared/providers/BranchProvider';

import type { LeadFilters } from '../domain/LeadFilters';
import type { LeadPageResponse } from '../domain/LeadPageResponse';
import { LeadService } from '../application/LeadService';
import { ApiLeadRepository } from '../infrastructure/ApiLeadRepository';
import { leadKeys } from './leadKeys';

const repository = new ApiLeadRepository();
export const leadService = new LeadService(repository);

export function useLeads(filters?: LeadFilters) {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...leadKeys.list(filters), selectedBranchId],
    queryFn: () => leadService.getLeads(filters),
  });
}

export function useLead(id: number) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  return useQuery({
    queryKey: [...leadKeys.detail(id), selectedBranchId],
    queryFn: () => leadService.getById(id),
    enabled: Boolean(id),
    placeholderData: () => {
      const listQueries = queryClient.getQueriesData<LeadPageResponse>({
        queryKey: leadKeys.lists(),
      });
      for (const [, data] of listQueries) {
        const match = data?.leads?.find((lead) => lead.id === id);
        if (match) return match;
      }
      return undefined;
    },
  });
}

export function useLeadStats() {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...leadKeys.stats(), selectedBranchId],
    queryFn: () => leadService.getStats(),
  });
}
