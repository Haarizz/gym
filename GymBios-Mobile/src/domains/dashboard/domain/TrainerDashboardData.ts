export interface TrainerInfo {
  name: string;
  specialization: string;
  /** Average member rating (1–5); null until the trainer has been rated. */
  rating: number | null;
  ratingCount: number;
}

export interface TrainerTodayStats {
  sessionsScheduled: number;
  sessionsCompleted: number;
  activeMembers: number;
  todayEarnings: number;
  monthlyTargetPercentage: number;
}

export interface TrainerTodaySession {
  id: string | number;
  time: string;
  member: string | null;
  className?: string | null;
  type: string;
  focus: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  phone?: string;
}

export interface TrainerPendingTask {
  id: string | number;
  task: string;
  urgent: boolean;
  completed?: boolean;
}

export interface TrainerDashboardData {
  trainerInfo: TrainerInfo;
  todaysStats: TrainerTodayStats;
  todaySessions: TrainerTodaySession[];
  pendingTasks: TrainerPendingTask[];
}
