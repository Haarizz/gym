import { apiClient } from '@/core/network/apiClient';
import { AutomationRepository } from '../application/AutomationRepository';
import { 
  AutomationExecutionLog, 
  AutomationStats, 
  AutomationWorkflow, 
  CreateWorkflowPayload, 
  UpdateWorkflowPayload 
} from '../domain/types';

export class ApiAutomationRepository implements AutomationRepository {
  async getAll(): Promise<AutomationWorkflow[]> {
    const response = await apiClient.get<AutomationWorkflow[]>('/automations');
    return response.data;
  }

  async getStats(): Promise<AutomationStats> {
    const response = await apiClient.get<AutomationStats>('/automations/stats');
    return response.data;
  }

  async getById(id: number): Promise<AutomationWorkflow> {
    const response = await apiClient.get<AutomationWorkflow>(`/automations/${id}`);
    return response.data;
  }

  async getLogs(id: number, page = 0, size = 20): Promise<AutomationExecutionLog[]> {
    const response = await apiClient.get<AutomationExecutionLog[]>(`/automations/${id}/logs`, {
      params: { page, size },
    });
    return response.data;
  }

  async create(payload: CreateWorkflowPayload): Promise<AutomationWorkflow> {
    const response = await apiClient.post<AutomationWorkflow>('/automations', payload);
    return response.data;
  }

  async update(id: number, payload: UpdateWorkflowPayload): Promise<AutomationWorkflow> {
    const response = await apiClient.put<AutomationWorkflow>(`/automations/${id}`, payload);
    return response.data;
  }

  async toggleStatus(id: number): Promise<AutomationWorkflow> {
    const response = await apiClient.put<AutomationWorkflow>(`/automations/${id}/toggle`);
    return response.data;
  }

  async manualRun(id: number): Promise<void> {
    await apiClient.post(`/automations/${id}/run`);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/automations/${id}`);
  }
}

export const apiAutomationRepository = new ApiAutomationRepository();
