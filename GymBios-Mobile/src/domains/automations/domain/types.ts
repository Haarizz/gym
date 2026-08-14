export type AutomationStatus = 'active' | 'paused' | 'draft' | 'error';
export type AutomationTriggerType =
  | 'membership_expiry'
  | 'birthday'
  | 'missed_workout'
  | 'low_attendance'
  | 'new_signup'
  | 'class_reminder'
  | 'goal_achievement'
  | 'payment_failed'
  | string;

export type AutomationTargetType = 'ALL' | 'SEGMENT';
export type AutomationActionType = 'send_in_app' | 'send_email' | 'send_sms' | 'send_whatsapp' | 'send_push' | 'create_task';
export type AutomationFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface AutomationWorkflow {
  id: number;
  companyId: number;
  name: string;
  description: string;
  status: AutomationStatus;

  triggerType: AutomationTriggerType;
  triggerParams: string; // JSON string
  
  targetType: AutomationTargetType;
  targetParams: string; // JSON string
  
  actionType: AutomationActionType;
  actionTitle?: string;
  actionContent?: string;
  actionSubject?: string;
  delayMinutes: number;
  
  frequency: AutomationFrequency;
  executionTime?: string; // HH:mm
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  
  lastRunAt?: string;
  nextRunAt?: string;
  cooldownHours: number;
  
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  membersEngaged: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AutomationExecutionStatus = 'success' | 'failed' | 'skipped';
export type AutomationTriggerSource = 'scheduler' | 'manual';

export interface AutomationExecutionLog {
  id: number;
  workflowId: number;
  ranAt: string;
  status: AutomationExecutionStatus;
  matchedCount: number;
  processedCount: number;
  errorMessage?: string;
  triggerSource: AutomationTriggerSource;
}

export interface AutomationStats {
  activeWorkflows: number;
  totalMembersEngaged: number;
  totalRuns: number;
  successRate: number;
  avgOpenRate: number;
  avgConversionRate: number;
  pendingTasks: number;
  errorCount: number;
}

export interface CreateWorkflowPayload {
  name: string;
  description: string;
  triggerType: string;
  triggerParams: string;
  actionType: string;
  actionTitle?: string;
  actionContent?: string;
  actionSubject?: string;
  delayMinutes: number;
  frequency: AutomationFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  cooldownHours?: number;
  timezone?: string;
}

export type UpdateWorkflowPayload = Partial<CreateWorkflowPayload>;
