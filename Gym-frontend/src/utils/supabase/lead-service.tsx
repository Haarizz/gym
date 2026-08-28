import { authService } from './auth-service';
import { FollowUpResponse } from './follow-up-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface LeadInteraction {
  id?: number;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'sms' | 'note';
  date: string;
  staffMember: string;
  notes: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  duration?: number;
}

export interface LeadResponse {
  id: number;
  leadId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'follow_up' | 'converted' | 'lost';
  source?: string;
  priority?: 'high' | 'medium' | 'low';
  assignedStaff?: string;
  nextFollowUp?: string;
  lastContactDate?: string;
  interestLevel?: number;
  notes?: string;
  tags?: string[];
  membershipInterest?: string;
  budget?: number;
  preferredContactMethod?: 'email' | 'phone' | 'whatsapp' | 'sms';
  leadScore?: number;
  interactions: LeadInteraction[];
  followUps?: FollowUpResponse[];
  createdAt: string;
  updatedAt?: string;
}

export interface LeadRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
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

export interface LeadStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  followUpLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
}

export interface LeadPage {
  leads: LeadResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapToLeadResponse(l: any): LeadResponse {
  if (!l) return l;
  return {
    ...l,
    id: l.id,
    leadId: l.lead_id || l.leadId,
    firstName: l.first_name || l.firstName || '',
    lastName: l.last_name || l.lastName || '',
    email: l.email,
    phone: l.phone,
    status: l.status,
    source: l.source,
    priority: l.priority,
    assignedStaff: l.assigned_staff || l.assignedStaff,
    nextFollowUp: l.next_follow_up || l.nextFollowUp,
    lastContactDate: l.last_contact_date || l.lastContactDate,
    interestLevel: l.interest_level || l.interestLevel,
    notes: l.notes,
    tags: l.tags || [],
    membershipInterest: l.membership_interest || l.membershipInterest,
    budget: l.budget,
    preferredContactMethod: l.preferred_contact_method || l.preferredContactMethod,
    leadScore: l.lead_score || l.leadScore,
    interactions: l.interactions || [],
    followUps: l.follow_ups || l.followUps || [],
    createdAt: l.created_at || l.createdAt,
    updatedAt: l.updated_at || l.updatedAt,
  };
}

// ── API Methods ────────────────────────────────────────────────────────────────

export const leadService = {

  async getLeads(params?: {
    page?: number;
    size?: number;
    status?: string;
    source?: string;
    priority?: string;
    search?: string;
  }): Promise<LeadPage> {
    const p = new URLSearchParams();
    if (params?.page)     p.set('page', String(params.page));
    if (params?.size)     p.set('size', String(params.size));
    if (params?.status)   p.set('status', params.status);
    if (params?.source)   p.set('source', params.source);
    if (params?.priority) p.set('priority', params.priority);
    if (params?.search)   p.set('search', params.search);
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads?${p}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    const raw = await res.json();
    const pg = raw.pagination ?? {};
    return {
      leads: (raw.leads ?? []).map(mapToLeadResponse),
      pagination: {
        currentPage: pg.page ?? 1,
        totalPages: pg.total_pages ?? pg.totalPages ?? 1,
        totalItems: pg.total ?? pg.totalItems ?? 0,
        itemsPerPage: pg.limit ?? pg.itemsPerPage ?? (params?.size ?? 20),
      },
    };
  },

  async getStats(): Promise<LeadStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/stats`);
    if (!res.ok) throw new Error('Failed to fetch lead stats');
    const raw = await res.json();
    return {
      totalLeads: raw.total_leads ?? 0,
      newLeads: raw.new_leads ?? 0,
      contactedLeads: raw.contacted_leads ?? 0,
      followUpLeads: raw.follow_up_leads ?? 0,
      convertedLeads: raw.converted_leads ?? 0,
      lostLeads: raw.lost_leads ?? 0,
      conversionRate: raw.conversion_rate ?? 0,
    };
  },

  async getById(id: number): Promise<LeadResponse> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lead');
    return mapToLeadResponse(await res.json());
  },

  async create(request: LeadRequest): Promise<LeadResponse> {
    const payload = {
      first_name: request.firstName,
      last_name: request.lastName,
      email: request.email,
      phone: request.phone,
      status: request.status,
      source: request.source,
      priority: request.priority,
      assigned_staff: request.assignedStaff,
      next_follow_up: request.nextFollowUp,
      last_contact_date: request.lastContactDate,
      interest_level: request.interestLevel,
      notes: request.notes,
      tags: request.tags,
      membership_interest: request.membershipInterest,
      budget: request.budget,
      preferred_contact_method: request.preferredContactMethod,
      lead_score: request.leadScore,
    };

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create lead');
    return mapToLeadResponse(await res.json());
  },

  async update(id: number, request: LeadRequest): Promise<LeadResponse> {
    const payload = {
      first_name: request.firstName,
      last_name: request.lastName,
      email: request.email,
      phone: request.phone,
      status: request.status,
      source: request.source,
      priority: request.priority,
      assigned_staff: request.assignedStaff,
      next_follow_up: request.nextFollowUp,
      last_contact_date: request.lastContactDate,
      interest_level: request.interestLevel,
      notes: request.notes,
      tags: request.tags,
      membership_interest: request.membershipInterest,
      budget: request.budget,
      preferred_contact_method: request.preferredContactMethod,
      lead_score: request.leadScore,
    };

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return mapToLeadResponse(await res.json());
  },

  async delete(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete lead');
  },

  async updateStatus(id: number, status: string): Promise<LeadResponse> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update lead status');
    return mapToLeadResponse(await res.json());
  },

  async addInteraction(leadId: number, interaction: LeadInteraction): Promise<LeadInteraction> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/${leadId}/interactions`, {
      method: 'POST',
      body: JSON.stringify(interaction),
    });
    if (!res.ok) throw new Error('Failed to add interaction');
    return res.json();
  },

  async deleteInteraction(interactionId: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/leads/interactions/${interactionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete interaction');
  },
};
