export interface ScheduleTask {
  id: string | number;
  time: string;
  type: 'Follow-up' | 'Meeting' | 'Tour' | string;
  name: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
  phone?: string;
}

export interface UpcomingFollowUp {
  id: string | number;
  name: string;
  date: string;
  time: string;
  type: string;
}

export interface ScheduleStats {
  today: number;
  thisWeek: number;
  pending: number;
}

export interface StaffScheduleData {
  dateText: string;
  stats: ScheduleStats;
  tasks: ScheduleTask[];
  upcomingFollowUps: UpcomingFollowUp[];
  productivityTip: string;
}
