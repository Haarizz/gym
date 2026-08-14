import type { Lead, LeadInteraction } from '../domain/Lead';
import type { LeadFilters } from '../domain/LeadFilters';
import type { LeadPageResponse } from '../domain/LeadPageResponse';
import type { AddLeadInteractionRequest, LeadRequest } from '../domain/LeadRequest';
import type { LeadStats } from '../domain/LeadStats';

export interface LeadRepository {
  getLeads(filters?: LeadFilters): Promise<LeadPageResponse>;

  getStats(): Promise<LeadStats>;

  getById(id: number): Promise<Lead>;

  create(request: LeadRequest): Promise<Lead>;

  update(id: number, request: LeadRequest): Promise<Lead>;

  delete(id: number): Promise<void>;

  updateStatus(id: number, status: string): Promise<Lead>;

  addInteraction(
    id: number,
    interaction: AddLeadInteractionRequest,
  ): Promise<LeadInteraction>;

  deleteInteraction(interactionId: number): Promise<void>;
}
