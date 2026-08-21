export interface MemberInfo {
  name: string;
  role: string;
  gymName: string;
  membershipType: string;
  daysRemaining: number;
  validUntil: string;
  isActive: boolean;
}

export interface MemberTodayScheduleItem {
  id?: string | number;
  time: string;
  class: string;
  trainer: string;
  spots: string;
  location?: string;
}

export interface MemberQuickStatItem {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export interface MemberDashboardData {
  memberInfo: MemberInfo;
  todaysSchedule: MemberTodayScheduleItem[];
  quickStats: MemberQuickStatItem[];
}
