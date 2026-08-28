import { apiClient } from '@/core/network/apiClient';
import type {
  MemberCheckInResponse,
  MemberCheckInStatus,
  MemberCheckOutResponse,
  MemberFeedbackPayload,
  MemberFeedbackResponse,
} from '../domain/MemberFeedback';

export const memberCheckInApi = {
  async getStatus(): Promise<MemberCheckInStatus> {
    const response = await apiClient.get<MemberCheckInStatus>('/mobile/member/check-in/status');
    const data = response.data;
    return {
      ...data,
      checkedIn: data.checkedIn ?? data.checked_in ?? false,
      attendanceId: data.attendanceId ?? data.attendance_id ?? null,
      checkInTime: data.checkInTime ?? data.check_in_time ?? null,
    };
  },

  async checkIn(): Promise<MemberCheckInResponse> {
    const response = await apiClient.post<MemberCheckInResponse>('/mobile/member/check-in', {});
    const data = response.data;
    return {
      ...data,
      checkedIn: data.checkedIn ?? data.checked_in ?? true,
      attendanceId: data.attendanceId ?? data.attendance_id,
      checkInTime: data.checkInTime ?? data.check_in_time,
    };
  },

  async checkOut(): Promise<MemberCheckOutResponse> {
    const response = await apiClient.post<MemberCheckOutResponse>('/mobile/member/check-out', {});
    const data = response.data;
    return {
      ...data,
      checkedIn: data.checkedIn ?? data.checked_in ?? false,
      attendanceId: data.attendanceId ?? data.attendance_id,
      checkInTime: data.checkInTime ?? data.check_in_time,
      checkOutTime: data.checkOutTime ?? data.check_out_time,
      durationMinutes: data.durationMinutes ?? data.duration_minutes,
    };
  },

  async submitFeedback(payload: MemberFeedbackPayload): Promise<MemberFeedbackResponse> {
    const serializedPayload = {
      attendance_id: payload.attendance_id ?? payload.attendanceId,
      attendanceId: payload.attendanceId ?? payload.attendance_id,
      overall_satisfaction: payload.overallSatisfaction ?? payload.overall_satisfaction,
      overallSatisfaction: payload.overallSatisfaction ?? payload.overall_satisfaction,
      workout_intensity: payload.workoutIntensity ?? payload.workout_intensity,
      workoutIntensity: payload.workoutIntensity ?? payload.workout_intensity,
      equipment_quality: payload.equipmentQuality ?? payload.equipment_quality,
      equipmentQuality: payload.equipmentQuality ?? payload.equipment_quality,
      facility_rating: payload.facilityRating ?? payload.facility_rating,
      facilityRating: payload.facilityRating ?? payload.facility_rating,
      recommend_workout: payload.recommendWorkout ?? payload.recommend_workout,
      recommendWorkout: payload.recommendWorkout ?? payload.recommend_workout,
      difficulty_level: payload.difficultyLevel ?? payload.difficulty_level,
      difficultyLevel: payload.difficultyLevel ?? payload.difficulty_level,
      pace_rating: payload.paceRating ?? payload.pace_rating,
      paceRating: payload.paceRating ?? payload.pace_rating,
      best_aspects: payload.bestAspects ?? payload.best_aspects,
      bestAspects: payload.bestAspects ?? payload.best_aspects,
      areas_for_improvement: payload.areasForImprovement ?? payload.areas_for_improvement,
      areasForImprovement: payload.areasForImprovement ?? payload.areas_for_improvement,
      comments: payload.comments,
      suggestions: payload.suggestions,
      energy_after_workout: payload.energyAfterWorkout ?? payload.energy_after_workout,
      energyAfterWorkout: payload.energyAfterWorkout ?? payload.energy_after_workout,
      likely_to_return: payload.likelyToReturn ?? payload.likely_to_return,
      likelyToReturn: payload.likelyToReturn ?? payload.likely_to_return,
      trainer_rating: payload.trainerRating ?? payload.trainer_rating,
      trainerRating: payload.trainerRating ?? payload.trainer_rating,
      would_recommend_trainer: payload.wouldRecommendTrainer ?? payload.would_recommend_trainer,
      wouldRecommendTrainer: payload.wouldRecommendTrainer ?? payload.would_recommend_trainer,
    };

    const response = await apiClient.post<MemberFeedbackResponse>(
      '/mobile/member/check-in/feedback',
      serializedPayload
    );
    return response.data;
  },
};
