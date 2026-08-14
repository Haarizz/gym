export interface ChurnPredictionItem {
  name: string;
  risk: string;
  lastVisit: string;
  membership: string;
  probability: number;
}

export interface TrainerPerformanceItem {
  name: string;
  classes: number;
  attendance: number;
  revenue: number;
  rating: number;
}

export interface CommunityFeatureEngagement {
  feature: string;
  posts: number;
  likes: number;
  comments: number;
  usage: number;
}

export interface WeeklyActivityPoint {
  week: string;
  posts: number;
  engagement: number;
}

export interface EngagementAnalyticsData {
  communityFeatures: CommunityFeatureEngagement[];
  weeklyActivity: WeeklyActivityPoint[];
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  percentage: number;
}

export interface ProfitabilityData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  costBreakdown: CostBreakdownItem[];
  revenuePerMember: number;
  lifetimeValue: number;
  newMembersThisMonth: number;
  churnRate: number;
}

export interface RecommendationItem {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  action: string;
}

export interface CommunityAdvancedAnalyticsData {
  churnPrediction: ChurnPredictionItem[];
  trainerPerformance: TrainerPerformanceItem[];
  engagementAnalytics: EngagementAnalyticsData;
  profitability: ProfitabilityData;
  recommendations: RecommendationItem[];
}
