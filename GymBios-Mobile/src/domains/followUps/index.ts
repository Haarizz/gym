// Domain Models
export type {
  FollowUp,
  CommunicationRecord,
  FollowUpStatus,
  FollowUpType,
  FollowUpPriority,
  FollowUpOutcome,
  MembershipStatus,
} from './domain/FollowUp';
export type { FollowUpStats } from './domain/FollowUpStats';
export type {
  FollowUpPageResponse,
  FollowUpPagination,
} from './domain/FollowUpPageResponse';
export type { FollowUpFilters } from './domain/FollowUpFilters';
export type {
  FollowUpRequest,
  CompleteFollowUpRequest,
  RescheduleFollowUpRequest,
  AddCommunicationRecordRequest,
} from './domain/FollowUpRequest';

// Application Layer
export type { FollowUpRepository } from './application/FollowUpRepository';
export { FollowUpService } from './application/FollowUpService';

// Infrastructure Layer
export { ApiFollowUpRepository } from './infrastructure/ApiFollowUpRepository';

// Hooks & Query Keys
export { followUpKeys } from './hooks/followUpKeys';
export {
  useFollowUps,
  useFollowUp,
  useFollowUpStats,
  followUpService,
} from './hooks/useFollowUps';
export {
  useCreateFollowUp,
  useUpdateFollowUp,
  useDeleteFollowUp,
  useCompleteFollowUp,
  useCancelFollowUp,
  useRescheduleFollowUp,
  useAddCommunicationRecord,
  useDeleteCommunicationRecord,
} from './hooks/useFollowUpMutations';

// Presentation Layer
export { FollowUpCard } from './presentation/components/FollowUpCard';
export { FollowUpList } from './presentation/components/FollowUpList';
export { FollowUpFilters as FollowUpFiltersComponent } from './presentation/components/FollowUpFilters';
export { AddFollowUpSheet } from './presentation/components/AddFollowUpSheet';
export { CompleteFollowUpSheet } from './presentation/components/CompleteFollowUpSheet';
export { RescheduleFollowUpSheet } from './presentation/components/RescheduleFollowUpSheet';
export { FollowUpDetailsSheet } from './presentation/components/FollowUpDetailsSheet';
export { FollowUpManagementScreen } from './presentation/screens/FollowUpManagementScreen';
