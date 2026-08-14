import { WorkoutFeedbackRepository } from './WorkoutFeedbackRepository';
import {
  WorkoutFeedback,
  WorkoutFeedbackAnalytics,
  WorkoutFeedbackNotesRequest,
  WorkoutFeedbackRequest,
  WorkoutSession,
} from '../domain';

export class WorkoutFeedbackService {
  constructor(private repository: WorkoutFeedbackRepository) {}

  async getSessions(memberId?: string): Promise<WorkoutSession[]> {
    return this.repository.getSessions(memberId);
  }

  async getFeedbacks(memberId?: string): Promise<WorkoutFeedback[]> {
    return this.repository.getFeedbacks(memberId);
  }

  async getAnalytics(): Promise<WorkoutFeedbackAnalytics> {
    return this.repository.getAnalytics();
  }

  async submitFeedback(request: WorkoutFeedbackRequest): Promise<void> {
    return this.repository.submitFeedback(request);
  }

  async updateNotes(id: string, request: WorkoutFeedbackNotesRequest): Promise<WorkoutFeedback> {
    return this.repository.updateNotes(id, request);
  }
}
