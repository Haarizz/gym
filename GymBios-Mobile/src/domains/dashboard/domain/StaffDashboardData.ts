export interface StaffInfo {
  name: string;
  role: string;
  branch: string;
}

export interface StaffTodayStats {
  leadsAdded: number;
  followUpsCompleted: number;
  conversions: number;
  checkins: number;
}

export interface UrgentFollowUpItem {
  id?: string | number;
  name: string;
  phone: string;
  inquiry: string;
  lastContact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RecentConversionItem {
  id?: string | number;
  name: string;
  plan: string;
  amount: string;
}

export interface StaffMonthSummary {
  targetAchievement: number;
  totalConversions: number;
  revenueGenerated: string;
  conversionRate: number;
}

export interface StaffDashboardData {
  staffInfo: StaffInfo;
  todaysStats: StaffTodayStats;
  urgentFollowUps: UrgentFollowUpItem[];
  recentConversions: RecentConversionItem[];
  monthlySummary: StaffMonthSummary;
}
