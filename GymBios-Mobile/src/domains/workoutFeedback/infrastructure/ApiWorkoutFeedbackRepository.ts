import { WorkoutFeedbackRepository } from '../application/WorkoutFeedbackRepository';
import {
  WorkoutFeedback,
  WorkoutFeedbackAnalytics,
  WorkoutFeedbackNotesRequest,
  WorkoutFeedbackRequest,
  WorkoutSession,
} from '../domain';
import { apiClient } from '@/core/network/apiClient';

export class ApiWorkoutFeedbackRepository implements WorkoutFeedbackRepository {
  async getSessions(memberId?: string): Promise<WorkoutSession[]> {
    const response = await apiClient.get<any[]>('/workout-feedback/sessions', {
      params: memberId ? { memberId } : undefined,
    });
    return response.data.map(s => ({
      id: s.id,
      memberId: s.member_id || s.memberId,
      memberName: s.member_name || s.memberName,
      workoutType: s.workout_type || s.workoutType,
      className: s.class_name || s.className,
      trainerId: s.trainer_id || s.trainerId,
      trainerName: s.trainer_name || s.trainerName,
      startTime: s.start_time || s.startTime,
      endTime: s.end_time || s.endTime,
      duration: s.duration,
      location: s.location,
      status: s.status,
    }));
  }

  async getFeedbacks(memberId?: string): Promise<WorkoutFeedback[]> {
    const response = await apiClient.get<any[]>('/workout-feedback', {
      params: memberId ? { memberId } : undefined,
    });
    return response.data.map(f => ({
      id: f.id,
      sessionId: f.session_id || f.sessionId,
      memberId: f.member_id || f.memberId,
      memberName: f.member_name || f.memberName,
      workoutType: f.workout_type || f.workoutType,
      className: f.class_name || f.className,
      trainerId: f.trainer_id || f.trainerId,
      trainerName: f.trainer_name || f.trainerName,
      submittedAt: f.submitted_at || f.submittedAt,
      overallSatisfaction: f.overall_satisfaction ?? f.overallSatisfaction,
      workoutIntensity: f.workout_intensity ?? f.workoutIntensity,
      trainerRating: f.trainer_rating ?? f.trainerRating,
      equipmentQuality: f.equipment_quality ?? f.equipmentQuality,
      facilityRating: f.facility_rating ?? f.facilityRating,
      recommendWorkout: f.recommend_workout || f.recommendWorkout,
      difficultyLevel: f.difficulty_level || f.difficultyLevel,
      paceRating: f.pace_rating || f.paceRating,
      bestAspects: f.best_aspects || f.bestAspects || [],
      areasForImprovement: f.areas_for_improvement || f.areasForImprovement || [],
      comments: f.comments,
      suggestions: f.suggestions,
      energyAfterWorkout: f.energy_after_workout || f.energyAfterWorkout,
      likelyToReturn: f.likely_to_return ?? f.likelyToReturn,
      wouldRecommendTrainer: f.would_recommend_trainer || f.wouldRecommendTrainer,
      trainerNotes: f.trainer_notes || f.trainerNotes,
      followUpRequired: f.follow_up_required ?? f.followUpRequired ?? false,
      flaggedForReview: f.flagged_for_review ?? f.flaggedForReview ?? false,
    }));
  }

  async getAnalytics(): Promise<WorkoutFeedbackAnalytics> {
    const response = await apiClient.get<any>('/workout-feedback/analytics');
    const a = response.data;
    return {
      todayFeedback: a.today_feedback ?? a.todayFeedback ?? 0,
      totalFeedback: a.total_feedback ?? a.totalFeedback ?? 0,
      avgSatisfaction: a.avg_satisfaction ?? a.avgSatisfaction ?? 0,
      recommendationRate: a.recommendation_rate ?? a.recommendationRate ?? 0,
      responseRate: a.response_rate ?? a.responseRate ?? 0,
      flaggedCount: a.flagged_count ?? a.flaggedCount ?? 0,
      followUpCount: a.follow_up_count ?? a.followUpCount ?? 0,
      completedSessions: a.completed_sessions ?? a.completedSessions ?? 0,
    };
  }

  async submitFeedback(request: WorkoutFeedbackRequest): Promise<void> {
    const payload = {
      session_id: request.sessionId,
      overall_satisfaction: request.overallSatisfaction,
      workout_intensity: request.workoutIntensity,
      trainer_rating: request.trainerRating,
      equipment_quality: request.equipmentQuality,
      facility_rating: request.facilityRating,
      recommend_workout: request.recommendWorkout,
      difficulty_level: request.difficultyLevel,
      pace_rating: request.paceRating,
      best_aspects: request.bestAspects,
      areas_for_improvement: request.areasForImprovement,
      comments: request.comments,
      suggestions: request.suggestions,
      energy_after_workout: request.energyAfterWorkout,
      likely_to_return: request.likelyToReturn,
      would_recommend_trainer: request.wouldRecommendTrainer,
    };
    await apiClient.post('/workout-feedback', payload);
  }

  async updateNotes(id: string, request: WorkoutFeedbackNotesRequest): Promise<WorkoutFeedback> {
    const payload = {
      trainer_notes: request.trainerNotes,
      follow_up_required: request.followUpRequired,
      flagged_for_review: request.flaggedForReview,
    };
    const response = await apiClient.patch<WorkoutFeedback>(`/workout-feedback/${id}/notes`, payload);
    return response.data;
  }
}
