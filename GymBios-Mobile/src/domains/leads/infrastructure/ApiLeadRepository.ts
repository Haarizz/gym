import type { LeadRepository } from '../application/LeadRepository';
import type { Lead, LeadInteraction } from '../domain/Lead';
import type { LeadFilters } from '../domain/LeadFilters';
import type { LeadPageResponse } from '../domain/LeadPageResponse';
import type { AddLeadInteractionRequest, LeadRequest } from '../domain/LeadRequest';
import type { LeadStats } from '../domain/LeadStats';

import { apiClient } from '@/core/network/apiClient';

interface LeadInteractionDTO {
  id: number;
  type: string;
  date: string;
  staffMember: string;
  notes: string;
  outcome: string;
  duration?: number | null;
}

interface LeadResponseDTO {
  id: number;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  priority: string;
  assignedStaff?: string | null;
  nextFollowUp?: string | null;
  lastContactDate?: string | null;
  interestLevel?: number | null;
  notes?: string | null;
  tags?: string[] | null;
  membershipInterest?: string | null;
  budget?: number | null;
  preferredContactMethod?: string | null;
  leadScore?: number | null;
  interactions?: LeadInteractionDTO[] | null;
  followUps?: Record<string, unknown>[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LeadPageResponseDTO {
  leads: LeadResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface LeadStatsDTO {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  followUpLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
}

export class ApiLeadRepository implements LeadRepository {
  async getLeads(filters?: LeadFilters): Promise<LeadPageResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (filters?.page !== undefined) params.page = filters.page;
    if (filters?.size !== undefined) params.size = filters.size;
    if (filters?.status) params.status = filters.status;
    if (filters?.source) params.source = filters.source;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.search) params.search = filters.search;

    const response = await apiClient.get<LeadPageResponseDTO>('/leads', {
      params,
    });

    return {
      leads: (response.data.leads ?? []).map(item => this.toLeadDomain(item)),
      pagination: {
        page: response.data.pagination?.page ?? 1,
        limit: response.data.pagination?.limit ?? 20,
        total: response.data.pagination?.total ?? 0,
        totalPages: response.data.pagination?.totalPages ?? 0,
      },
    };
  }

  async getStats(): Promise<LeadStats> {
    const response = await apiClient.get<LeadStatsDTO>('/leads/stats');

    return {
      totalLeads: response.data.totalLeads ?? 0,
      newLeads: response.data.newLeads ?? 0,
      contactedLeads: response.data.contactedLeads ?? 0,
      followUpLeads: response.data.followUpLeads ?? 0,
      convertedLeads: response.data.convertedLeads ?? 0,
      lostLeads: response.data.lostLeads ?? 0,
      conversionRate: response.data.conversionRate ?? 0,
    };
  }

  async getById(id: number): Promise<Lead> {
    const response = await apiClient.get<LeadResponseDTO>(`/leads/${id}`);

    return this.toLeadDomain(response.data);
  }

  async create(request: LeadRequest): Promise<Lead> {
    const response = await apiClient.post<LeadResponseDTO>('/leads', request);

    return this.toLeadDomain(response.data);
  }

  async update(id: number, request: LeadRequest): Promise<Lead> {
    const response = await apiClient.put<LeadResponseDTO>(
      `/leads/${id}`,
      request,
    );

    return this.toLeadDomain(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/leads/${id}`);
  }

  async updateStatus(id: number, status: string): Promise<Lead> {
    const response = await apiClient.patch<LeadResponseDTO>(
      `/leads/${id}/status`,
      { status },
    );

    return this.toLeadDomain(response.data);
  }

  async addInteraction(
    id: number,
    interaction: AddLeadInteractionRequest,
  ): Promise<LeadInteraction> {
    const response = await apiClient.post<LeadInteractionDTO>(
      `/leads/${id}/interactions`,
      interaction,
    );

    return this.toInteractionDomain(response.data);
  }

  async deleteInteraction(interactionId: number): Promise<void> {
    await apiClient.delete(`/leads/interactions/${interactionId}`);
  }

  private toLeadDomain(response: LeadResponseDTO): Lead {
    return {
      id: response.id,
      leadId: response.leadId,
      firstName: response.firstName,
      lastName: response.lastName,
      email: response.email,
      phone: response.phone,
      status: response.status,
      source: response.source,
      priority: response.priority,
      assignedStaff: response.assignedStaff ?? undefined,
      nextFollowUp: response.nextFollowUp ?? undefined,
      lastContactDate: response.lastContactDate ?? undefined,
      interestLevel: response.interestLevel ?? undefined,
      notes: response.notes ?? undefined,
      tags: response.tags ?? [],
      membershipInterest: response.membershipInterest ?? undefined,
      budget: response.budget ?? undefined,
      preferredContactMethod: response.preferredContactMethod ?? undefined,
      leadScore: response.leadScore ?? undefined,
      interactions: (response.interactions ?? []).map(item =>
        this.toInteractionDomain(item),
      ),
      followUps: response.followUps ?? [],
      createdAt: response.createdAt ?? undefined,
      updatedAt: response.updatedAt ?? undefined,
    };
  }

  private toInteractionDomain(response: LeadInteractionDTO): LeadInteraction {
    return {
      id: response.id,
      type: response.type,
      date: response.date,
      staffMember: response.staffMember,
      notes: response.notes,
      outcome: response.outcome,
      duration: response.duration ?? undefined,
    };
  }
}
