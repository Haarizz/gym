export type CollectionPeriod = 'today' | 'yesterday' | 'thisMonth';

export interface TargetProgressData {
  assigned: number;
  achieved: number;
  progress: number;
}

export interface CollectionCategoryBreakdown {
  membership: number;
  addons: number;
  pos: number;
  total: number;
}

export interface CollectionsData {
  today: CollectionCategoryBreakdown;
  yesterday: CollectionCategoryBreakdown;
  thisMonth: CollectionCategoryBreakdown;
}

export interface DailyRevenueTrendPoint {
  date: string;
  revenue: number;
  members: number;
}

export interface MonthlyPerformancePoint {
  month: string;
  revenue: number;
  target: number;
}

export interface StaffPerformanceItem {
  name: string;
  sales: number;
  target: number;
  achievement: number;
}

export interface RetentionFunnelStage {
  name: string;
  value: number;
  color: string;
}

export interface CommunityAnalyticsData {
  targets: TargetProgressData;
  collections: CollectionsData;
  trends: {
    daily: DailyRevenueTrendPoint[];
    monthly: MonthlyPerformancePoint[];
  };
  staffPerformance: StaffPerformanceItem[];
  retentionFunnel: RetentionFunnelStage[];
}
