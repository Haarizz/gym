export const workoutFeedbackKeys = {
  all: ['workoutFeedback'] as const,
  sessions: (memberId?: string) => [...workoutFeedbackKeys.all, 'sessions', { memberId }] as const,
  feedbacks: (memberId?: string) => [...workoutFeedbackKeys.all, 'list', { memberId }] as const,
  analytics: () => [...workoutFeedbackKeys.all, 'analytics'] as const,
};
