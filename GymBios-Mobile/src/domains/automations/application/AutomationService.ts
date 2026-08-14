import { AutomationRepository } from './AutomationRepository';
import { 
  CreateWorkflowPayload, 
  UpdateWorkflowPayload,
  AutomationWorkflow,
  AutomationStats,
  AutomationExecutionLog
} from '../domain/types';

export class AutomationService {
  constructor(private readonly repository: AutomationRepository) {}

  async getAllWorkflows(): Promise<AutomationWorkflow[]> {
    return this.repository.getAll();
  }

  async getWorkflowStats(): Promise<AutomationStats> {
    return this.repository.getStats();
  }

  async getWorkflowById(id: number): Promise<AutomationWorkflow> {
    return this.repository.getById(id);
  }

  async getExecutionLogs(id: number, page?: number, size?: number): Promise<AutomationExecutionLog[]> {
    return this.repository.getLogs(id, page, size);
  }

  async createWorkflow(payload: CreateWorkflowPayload): Promise<AutomationWorkflow> {
    // Add any necessary frontend-safe business logic or sanitization here before passing to repo
    return this.repository.create(payload);
  }

  async updateWorkflow(id: number, payload: UpdateWorkflowPayload): Promise<AutomationWorkflow> {
    return this.repository.update(id, payload);
  }

  async toggleWorkflowStatus(id: number): Promise<AutomationWorkflow> {
    return this.repository.toggleStatus(id);
  }

  async manualRunWorkflow(id: number): Promise<void> {
    await this.repository.manualRun(id);
  }

  async deleteWorkflow(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
