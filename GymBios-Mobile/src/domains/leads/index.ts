// Domain Models
export type {
  Lead,
  LeadInteraction,
  LeadStatus,
  LeadPriority,
  LeadSource,
  LeadInteractionType,
  LeadInteractionOutcome,
} from './domain/Lead';
export type { LeadStats } from './domain/LeadStats';
export type { LeadPageResponse, LeadPagination } from './domain/LeadPageResponse';
export type { LeadFilters } from './domain/LeadFilters';
export type { LeadRequest, AddLeadInteractionRequest } from './domain/LeadRequest';

// Application Layer
export type { LeadRepository } from './application/LeadRepository';
export { LeadService } from './application/LeadService';

// Infrastructure Layer
export { ApiLeadRepository } from './infrastructure/ApiLeadRepository';

// Hooks & Query Keys
export { leadKeys } from './hooks/leadKeys';
export { useLeads, useLead, useLeadStats, leadService } from './hooks/useLeads';
export {
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useUpdateLeadStatus,
  useAddLeadInteraction,
  useDeleteLeadInteraction,
} from './hooks/useLeadMutations';

// Presentation Layer
export { LeadCard } from './presentation/components/LeadCard';
export { LeadList } from './presentation/components/LeadList';
export { LeadSelectionToolbar } from './presentation/components/LeadSelectionToolbar';
export { LeadFilters as LeadFiltersComponent } from './presentation/components/LeadFilters';
export { LeadActionButtons } from './presentation/components/LeadActionButtons';
export { useLeadSelection } from './presentation/hooks/useLeadSelection';
export { LeadDetailsSheet } from './presentation/components/LeadDetailsSheet';
export { LeadManagementScreen } from './presentation/screens/LeadManagementScreen';


