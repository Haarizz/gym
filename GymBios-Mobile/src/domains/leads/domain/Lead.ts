export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow-up'
  | 'converted'
  | 'lost'
  | (string & {});

export type LeadPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | (string & {});

export type LeadSource =
  | 'website'
  | 'referral'
  | 'walk-in'
  | 'social-media'
  | 'phone'
  | 'campaign'
  | 'other'
  | (string & {});

export type LeadInteractionType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'tour'
  | 'sms'
  | (string & {});

export type LeadInteractionOutcome =
  | 'connected'
  | 'no-answer'
  | 'interested'
  | 'not-interested'
  | 'scheduled-tour'
  | 'converted'
  | (string & {});

export interface LeadInteraction {
  id: number;
  type: LeadInteractionType;
  date: string;
  staffMember: string;
  notes: string;
  outcome: LeadInteractionOutcome;
  duration?: number;
}

export interface Lead {
  id: number;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  assignedStaff?: string;
  nextFollowUp?: string;
  lastContactDate?: string;
  interestLevel?: number;
  notes?: string;
  tags: string[];
  membershipInterest?: string;
  budget?: number;
  preferredContactMethod?: string;
  leadScore?: number;
  interactions: LeadInteraction[];
  followUps?: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
}
