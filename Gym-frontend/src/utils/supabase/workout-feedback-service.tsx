import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Mirrors the backend's WorkoutFeedbackDTO (global Jackson SNAKE_CASE strategy).
export interface WorkoutFeedback {
  id: string;
  session_id?: string | null;
  member_id?: string | null;
  member_name?: string | null;
  workout_type?: string | null;
  class_name?: string | null;
  trainer_id?: string | null;
  trainer_name?: string | null;
  submitted_at?: string | null;
  overall_satisfaction?: number | null;
  workout_intensity?: number | null;
  trainer_rating?: number | null;
  equipment_quality?: number | null;
  facility_rating?: number | null;
  recommend_workout?: string | null;
  difficulty_level?: string | null;
  pace_rating?: string | null;
  best_aspects?: string[] | null;
  areas_for_improvement?: string[] | null;
  comments?: string | null;
  suggestions?: string | null;
  energy_after_workout?: string | null;
  likely_to_return?: number | null;
  would_recommend_trainer?: string | null;
  trainer_notes?: string | null;
  follow_up_required?: boolean | null;
  flagged_for_review?: boolean | null;
}

// Mirrors the backend's WorkoutSessionDTO.
export interface WorkoutSession {
  id: string;
  member_id?: string | null;
  member_name?: string | null;
  workout_type?: string | null;
  class_name?: string | null;
  trainer_id?: string | null;
  trainer_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration?: number | null;
  location?: string | null;
  status?: string | null;
}

class WorkoutFeedbackService {

  async getMemberFeedback(memberDbId: string | number): Promise<WorkoutFeedback[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/workout-feedback?memberId=${memberDbId}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch workout feedback: ${response.status}`));
    return response.json();
  }

  async getMemberSessions(memberDbId: string | number): Promise<WorkoutSession[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/workout-feedback/sessions?memberId=${memberDbId}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch workout sessions: ${response.status}`));
    return response.json();
  }
}

export const workoutFeedbackService = new WorkoutFeedbackService();
