export interface StaffSummary {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  presentToday: number;
  absentToday: number;
}

export type StaffPerformanceStatus = 'EXCELLENT' | 'ON_TRACK' | 'AT_RISK' | 'NO_TARGET';

/** Current-month performance snapshot for one staff member. */
export interface StaffPerformance {
  staffId: string;
  revenueTarget: number;
  revenueAchieved: number;
  achievementPercentage: number;
  conversionRate: number;
  ptSessions: number;
  attendanceRate: number;
  rating: number;
  ratingCount: number;
  presentToday: boolean;
  performanceStatus: StaffPerformanceStatus;
}
