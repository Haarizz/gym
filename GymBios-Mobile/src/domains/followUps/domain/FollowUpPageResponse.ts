import type { FollowUp } from './FollowUp';

export interface FollowUpPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FollowUpPageResponse {
  followUps: FollowUp[];
  pagination: FollowUpPagination;
}
