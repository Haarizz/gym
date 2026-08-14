export interface LeadRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status?: string;
  source?: string;
  priority?: string;
  assignedStaff?: string;
  nextFollowUp?: string;
  lastContactDate?: string;
  interestLevel?: number;
  notes?: string;
  tags?: string[];
  membershipInterest?: string;
  budget?: number;
  preferredContactMethod?: string;
  leadScore?: number;
}

export interface AddLeadInteractionRequest {
  type: string;
  date?: string;
  staffMember?: string;
  notes?: string;
  outcome?: string;
  duration?: number;
}
