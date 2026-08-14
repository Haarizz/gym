import type { Lead } from './Lead';

export interface LeadPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadPageResponse {
  leads: Lead[];
  pagination: LeadPagination;
}
