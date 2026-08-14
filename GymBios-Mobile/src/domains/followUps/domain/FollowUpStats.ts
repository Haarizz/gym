export interface FollowUpStats {
  totalFollowUps: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  cancelledFollowUps: number;
  rescheduledFollowUps: number;
  completionRate: number;
}
