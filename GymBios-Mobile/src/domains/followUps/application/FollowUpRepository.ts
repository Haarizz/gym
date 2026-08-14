import type { CommunicationRecord, FollowUp } from '../domain/FollowUp';
import type { FollowUpFilters } from '../domain/FollowUpFilters';
import type { FollowUpPageResponse } from '../domain/FollowUpPageResponse';
import type {
  AddCommunicationRecordRequest,
  CompleteFollowUpRequest,
  FollowUpRequest,
  RescheduleFollowUpRequest,
} from '../domain/FollowUpRequest';
import type { FollowUpStats } from '../domain/FollowUpStats';

export interface FollowUpRepository {
  getFollowUps(filters?: FollowUpFilters): Promise<FollowUpPageResponse>;

  getStats(): Promise<FollowUpStats>;

  getById(id: number): Promise<FollowUp>;

  create(request: FollowUpRequest): Promise<FollowUp>;

  update(id: number, request: FollowUpRequest): Promise<FollowUp>;

  delete(id: number): Promise<void>;

  complete(id: number, request: CompleteFollowUpRequest): Promise<FollowUp>;

  cancel(id: number): Promise<FollowUp>;

  reschedule(id: number, request: RescheduleFollowUpRequest): Promise<FollowUp>;

  markOverdue(): Promise<void>;

  addRecord(
    id: number,
    record: AddCommunicationRecordRequest,
  ): Promise<CommunicationRecord>;

  deleteRecord(recordId: number): Promise<void>;
}
