import { 
  AutomationExecutionLog, 
  AutomationStats, 
  AutomationWorkflow, 
  CreateWorkflowPayload, 
  UpdateWorkflowPayload 
} from '../domain/types';

export interface AutomationRepository {
  getAll(): Promise<AutomationWorkflow[]>;
  getStats(): Promise<AutomationStats>;
  getById(id: number): Promise<AutomationWorkflow>;
  getLogs(id: number, page?: number, size?: number): Promise<AutomationExecutionLog[]>;
  create(payload: CreateWorkflowPayload): Promise<AutomationWorkflow>;
  update(id: number, payload: UpdateWorkflowPayload): Promise<AutomationWorkflow>;
  toggleStatus(id: number): Promise<AutomationWorkflow>;
  manualRun(id: number): Promise<void>;
  delete(id: number): Promise<void>;
}
