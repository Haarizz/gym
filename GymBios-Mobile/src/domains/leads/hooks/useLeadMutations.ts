import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AddLeadInteractionRequest, LeadRequest } from '../domain/LeadRequest';
import { leadKeys } from './leadKeys';
import { leadService } from './useLeads';

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LeadRequest) => leadService.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: LeadRequest }) =>
      leadService.update(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: leadKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      leadService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: leadKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

export function useAddLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      interaction,
    }: {
      id: number;
      interaction: AddLeadInteractionRequest;
    }) => leadService.addInteraction(id, interaction),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: leadKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      interactionId,
    }: {
      leadId: number;
      interactionId: number;
    }) => leadService.deleteInteraction(interactionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: leadKeys.detail(variables.leadId),
      });
    },
  });
}
