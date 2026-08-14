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
import type { FollowUpRepository } from './FollowUpRepository';

export class FollowUpService {
  constructor(private readonly repository: FollowUpRepository) {}

  getFollowUps(filters?: FollowUpFilters): Promise<FollowUpPageResponse> {
    return this.repository.getFollowUps(filters);
  }

  getStats(): Promise<FollowUpStats> {
    return this.repository.getStats();
  }

  getById(id: number): Promise<FollowUp> {
    return this.repository.getById(id);
  }

  create(request: FollowUpRequest): Promise<FollowUp> {
    return this.repository.create(request);
  }

  update(id: number, request: FollowUpRequest): Promise<FollowUp> {
    return this.repository.update(id, request);
  }

  delete(id: number): Promise<void> {
    return this.repository.delete(id);
  }

  complete(id: number, request: CompleteFollowUpRequest): Promise<FollowUp> {
    return this.repository.complete(id, request);
  }

  cancel(id: number): Promise<FollowUp> {
    return this.repository.cancel(id);
  }

  reschedule(
    id: number,
    request: RescheduleFollowUpRequest,
  ): Promise<FollowUp> {
    return this.repository.reschedule(id, request);
  }

  markOverdue(): Promise<void> {
    return this.repository.markOverdue();
  }

  addRecord(
    id: number,
    record: AddCommunicationRecordRequest,
  ): Promise<CommunicationRecord> {
    return this.repository.addRecord(id, record);
  }

  deleteRecord(recordId: number): Promise<void> {
    return this.repository.deleteRecord(recordId);
  }
}
