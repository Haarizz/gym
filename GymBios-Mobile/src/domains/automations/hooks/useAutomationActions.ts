import { useMutation, useQueryClient } from '@tanstack/react-query';
import { automationService, automationKeys } from './useAutomations';
import { CreateWorkflowPayload, UpdateWorkflowPayload } from '../domain/types';

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkflowPayload) => automationService.createWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

export function useUpdateAutomation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWorkflowPayload) => automationService.updateWorkflow(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: automationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

export function useToggleAutomationStatus(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => automationService.toggleWorkflowStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: automationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

export function useRunAutomation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => automationService.manualRunWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.executions(id) });
      queryClient.invalidateQueries({ queryKey: automationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
    },
  });
}

export function useDeleteAutomation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => automationService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
      queryClient.removeQueries({ queryKey: automationKeys.detail(id) });
    },
  });
}
