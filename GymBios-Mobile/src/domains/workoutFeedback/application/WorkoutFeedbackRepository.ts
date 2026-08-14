import {
  WorkoutFeedback,
  WorkoutFeedbackAnalytics,
  WorkoutFeedbackNotesRequest,
  WorkoutFeedbackRequest,
  WorkoutSession,
} from '../domain';

export interface WorkoutFeedbackRepository {
  getSessions(memberId?: string): Promise<WorkoutSession[]>;
  getFeedbacks(memberId?: string): Promise<WorkoutFeedback[]>;
  getAnalytics(): Promise<WorkoutFeedbackAnalytics>;
  submitFeedback(request: WorkoutFeedbackRequest): Promise<void>;
  updateNotes(id: string, request: WorkoutFeedbackNotesRequest): Promise<WorkoutFeedback>;
}
