import { apiClient } from '@/core/network/apiClient';

export interface CreateMobileStaffLeadRequestDTO {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  status?: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  interestLevel?: number;
  notes?: string;
  tags?: string[];
  membershipInterest?: string;
  budget?: number;
  preferredContactMethod?: string;
  leadScore?: number;

  followUpType: string;
  followUpStatus?: string;
  followUpPriority: 'low' | 'medium' | 'high';
  followUpDueDate: string;
  followUpScheduledTime?: string;
  followUpSubject: string;
  followUpNotes?: string;
  followUpTags?: string[];
  followUpMembershipStatus?: string;
  followUpMembershipPlan?: string;
  followUpReason?: string;
  followUpEstimatedDuration?: number;
  followUpOutcome?: string;
}

export interface MobileCreatedLeadDTO {
  id: number;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  assignedStaff: string;
  notes: string;
  tags: string[];
  createdAt: string;
}

export interface MobileCreatedFollowUpDTO {
  id: number;
  followUpId: string;
  leadId: number;
  type: string;
  status: string;
  priority: string;
  assignedStaff: string;
  dueDate: string;
  subject: string;
  notes: string;
  createdAt: string;
}

export interface CreateMobileStaffLeadResponseDTO {
  lead: MobileCreatedLeadDTO;
  followUp: MobileCreatedFollowUpDTO;
}

export const staffLeadRepository = {
  createLeadAndFollowUp: async (
    data: CreateMobileStaffLeadRequestDTO
  ): Promise<CreateMobileStaffLeadResponseDTO> => {
    const response = await apiClient.post<CreateMobileStaffLeadResponseDTO>(
      '/mobile/staff/leads',
      data
    );
    return response.data;
  },
};
