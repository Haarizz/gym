import type { Lead, LeadInteraction } from '../domain/Lead';
import type { LeadFilters } from '../domain/LeadFilters';
import type { LeadPageResponse } from '../domain/LeadPageResponse';
import type { AddLeadInteractionRequest, LeadRequest } from '../domain/LeadRequest';
import type { LeadStats } from '../domain/LeadStats';
import type { LeadRepository } from './LeadRepository';

export class LeadService {
  constructor(private readonly repository: LeadRepository) {}

  getLeads(filters?: LeadFilters): Promise<LeadPageResponse> {
    return this.repository.getLeads(filters);
  }

  getStats(): Promise<LeadStats> {
    return this.repository.getStats();
  }

  getById(id: number): Promise<Lead> {
    return this.repository.getById(id);
  }

  create(request: LeadRequest): Promise<Lead> {
    return this.repository.create(request);
  }

  update(id: number, request: LeadRequest): Promise<Lead> {
    return this.repository.update(id, request);
  }

  delete(id: number): Promise<void> {
    return this.repository.delete(id);
  }

  updateStatus(id: number, status: string): Promise<Lead> {
    return this.repository.updateStatus(id, status);
  }

  addInteraction(
    id: number,
    interaction: AddLeadInteractionRequest,
  ): Promise<LeadInteraction> {
    return this.repository.addInteraction(id, interaction);
  }

  deleteInteraction(interactionId: number): Promise<void> {
    return this.repository.deleteInteraction(interactionId);
  }
}
