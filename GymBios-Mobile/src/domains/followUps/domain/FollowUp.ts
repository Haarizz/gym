export type FollowUpStatus =
  | 'pending'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'rescheduled'
  | (string & {});

export type FollowUpType =
  | 'call'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'in-app'
  | 'in_app'
  | 'meeting'
  | 'visit'
  | (string & {});

export type FollowUpPriority =
  | 'high'
  | 'medium'
  | 'low'
  | (string & {});

export type FollowUpOutcome =
  | 'successful'
  | 'no-response'
  | 'callback-requested'
  | 'not-interested'
  | 'converted'
  | 'rescheduled'
  | (string & {});

export type MembershipStatus =
  | 'active'
  | 'pending'
  | 'expired'
  | 'frozen'
  | 'cancelled'
  | (string & {});

export interface CommunicationRecord {
  id: number;
  type: FollowUpType;
  date: string;
  staffMember: string;
  duration?: number;
  outcome: FollowUpOutcome;
  notes: string;
  nextAction?: string;
}

export interface FollowUp {
  id: number;
  followUpId: string;
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  type: FollowUpType;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  assignedStaff?: string;
  dueDate: string;
  scheduledTime?: string;
  completedDate?: string;
  subject: string;
  notes?: string;
  tags: string[];
  membershipStatus?: MembershipStatus;
  membershipPlan?: string;
  followUpReason?: string;
  estimatedDuration?: number;
  outcome?: FollowUpOutcome;
  communicationHistory: CommunicationRecord[];
  createdAt?: string;
  updatedAt?: string;
}
