export interface WorkoutSession {
  id: string;
  memberId: string;
  memberName: string;
  workoutType: string;
  className: string;
  trainerId: string;
  trainerName: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  status: string;
}
