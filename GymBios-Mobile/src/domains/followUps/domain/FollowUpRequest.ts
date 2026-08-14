export interface FollowUpRequest {
  leadId: number;
  type: string;
  status?: string;
  priority?: string;
  assignedStaff?: string;
  dueDate: string;
  scheduledTime?: string;
  completedDate?: string;
  subject: string;
  notes?: string;
  tags?: string[];
  membershipStatus?: string;
  membershipPlan?: string;
  followUpReason?: string;
  estimatedDuration?: number;
  outcome?: string;
}

export interface CompleteFollowUpRequest {
  outcome?: string;
  notes?: string;
}

export interface RescheduleFollowUpRequest {
  dueDate: string;
}

export interface AddCommunicationRecordRequest {
  type: string;
  date?: string;
  staffMember?: string;
  duration?: number;
  outcome?: string;
  notes: string;
  nextAction?: string;
}
