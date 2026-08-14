import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutFeedbackKeys } from './workoutFeedbackKeys';
import { WorkoutFeedbackService } from '../application/WorkoutFeedbackService';
import { ApiWorkoutFeedbackRepository } from '../infrastructure/ApiWorkoutFeedbackRepository';
import {
  WorkoutFeedbackNotesRequest,
  WorkoutFeedbackRequest,
} from '../domain';

const repository = new ApiWorkoutFeedbackRepository();
const service = new WorkoutFeedbackService(repository);

export const useWorkoutSessions = (memberId?: string) => {
  return useQuery({
    queryKey: workoutFeedbackKeys.sessions(memberId),
    queryFn: () => service.getSessions(memberId),
  });
};

export const useWorkoutFeedback = (memberId?: string) => {
  return useQuery({
    queryKey: workoutFeedbackKeys.feedbacks(memberId),
    queryFn: () => service.getFeedbacks(memberId),
  });
};

export const useWorkoutFeedbackAnalytics = () => {
  return useQuery({
    queryKey: workoutFeedbackKeys.analytics(),
    queryFn: () => service.getAnalytics(),
  });
};

export const useSubmitWorkoutFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WorkoutFeedbackRequest) => service.submitFeedback(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutFeedbackKeys.feedbacks() });
      queryClient.invalidateQueries({ queryKey: workoutFeedbackKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: workoutFeedbackKeys.analytics() });
    },
  });
};

export const useUpdateWorkoutFeedbackNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: WorkoutFeedbackNotesRequest }) =>
      service.updateNotes(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutFeedbackKeys.feedbacks() });
    },
  });
};
