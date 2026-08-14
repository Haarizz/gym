import { useQuery } from '@tanstack/react-query';
import { apiAutomationRepository } from '../infrastructure/ApiAutomationRepository';
import { AutomationService } from '../application/AutomationService';

export const automationService = new AutomationService(apiAutomationRepository);

export const automationKeys = {
  all: ['automations'] as const,
  lists: () => [...automationKeys.all, 'list'] as const,
  detail: (id: number) => [...automationKeys.all, 'detail', id] as const,
  stats: () => [...automationKeys.all, 'stats'] as const,
  executions: (id: number) => [...automationKeys.all, 'executions', id] as const,
};

export function useAutomations() {
  return useQuery({
    queryKey: automationKeys.lists(),
    queryFn: () => automationService.getAllWorkflows(),
  });
}

export function useAutomationStats() {
  return useQuery({
    queryKey: automationKeys.stats(),
    queryFn: () => automationService.getWorkflowStats(),
  });
}

export function useAutomation(id: number, enabled = true) {
  return useQuery({
    queryKey: automationKeys.detail(id),
    queryFn: () => automationService.getWorkflowById(id),
    enabled: enabled && !!id,
  });
}

export function useAutomationLogs(id: number, enabled = true) {
  return useQuery({
    queryKey: automationKeys.executions(id),
    queryFn: () => automationService.getExecutionLogs(id),
    enabled: enabled && !!id,
  });
}
