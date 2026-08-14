export interface WorkoutFeedbackNotesRequest {
  trainerNotes: string | null;
  followUpRequired: boolean | null;
  flaggedForReview: boolean | null;
}
