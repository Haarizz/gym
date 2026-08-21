export interface PerformanceTargets {
  monthlyTarget: number;
  achieved: number;
  percentage: number;
  conversionsTarget: number;
  conversionsAchieved: number;
  rating: number;
  growth: string;
  leads: number;
}

export interface MonthlyTrendItem {
  month: string;
  conversions: number;
  revenue: number;
  [key: string]: string | number;
}

export interface LeaderboardItem {
  name: string;
  conversions: number;
  revenue: string;
  rank: number;
  isCurrentUser?: boolean;
}

export interface PerformanceBreakdown {
  conversionRate: number;
  followUpCompletion: number;
  customerSatisfaction: number;
}

export interface StaffPerformanceData {
  targets: PerformanceTargets;
  monthlyTrends: MonthlyTrendItem[];
  leaderboard: LeaderboardItem[];
  breakdown: PerformanceBreakdown;
  motivationMessage: string;
}
