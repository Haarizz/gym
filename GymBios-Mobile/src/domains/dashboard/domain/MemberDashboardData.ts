export interface MemberInfo {
  name: string;
  role: string;
  gymName: string;
  membershipType: string;
  daysRemaining: number;
  validUntil: string;
  isActive: boolean;
  status?: string;
  isFrozen: boolean;
  totalVisits: number;
}

export interface MemberTodayScheduleItem {
  id?: string | number;
  time: string;
  class: string;
  trainer: string;
  spotsLeft: number;
  location?: string;
}

export interface MemberQuickStatItem {
  kind: 'checkIns' | 'classes' | 'calories' | 'streak';
  label: string;
  value: string;
  icon: string;
  color: string;
}

export interface MemberDashboardCheckInStatus {
  checkedIn: boolean;
  activeAttendanceId?: number | null;
  checkInTime?: string | null;
}

export interface MemberDashboardData {
  memberInfo: MemberInfo;
  todaysSchedule: MemberTodayScheduleItem[];
  quickStats: MemberQuickStatItem[];
  checkInStatus?: MemberDashboardCheckInStatus;
}
