import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/network/apiClient';
import { useBranchContext } from "@/shared/providers/BranchProvider";

export interface AdminAnalyticsData {
  aiInsights: string[];
  overview: {
    revenueGrowth: number;
    memberGrowth: number;
    churnRate: number;
    churnImprovement: number;
    averageRevenuePerMember: number;
    memberVsChurn: { month: string; newMembers: number; churned: number }[];
  };
  revenue: {
    trend: { month: string; revenue: number }[];
    branchRankings: { rank: number; branchName: string; rating: number; revenue: number; members: number }[];
  };
  operations: {
    classUtilization: { classType: string; utilization: number }[];
    trainerProductivity: {
      averageSessionsPerTrainer: number;
      memberSatisfaction: number;
      ptPackageSales: number;
    };
    addonPerformance: { name: string; revenue: number }[];
  };
}

export function useAdminAnalytics() {
    const { selectedBranchId } = useBranchContext();
  const query = useQuery<AdminAnalyticsData>({
    queryKey: ['admin-analytics', selectedBranchId],
    queryFn: async () => {
      // API returns snake_case due to backend Jackson configuration
      const res = await apiClient.get<any>('/mobile/admin/analytics');
      const raw = res.data;

      return {
        aiInsights: raw.ai_insights || [],
        overview: {
          revenueGrowth: raw.overview?.revenue_growth ?? 0,
          memberGrowth: raw.overview?.member_growth ?? 0,
          churnRate: raw.overview?.churn_rate ?? 0,
          churnImprovement: raw.overview?.churn_improvement ?? 0,
          averageRevenuePerMember: raw.overview?.average_revenue_per_member ?? 0,
          memberVsChurn: (raw.overview?.member_vs_churn || []).map((item: any) => ({
            month: item.month,
            newMembers: item.new_members,
            churned: item.churned,
          })),
        },
        revenue: {
          trend: (raw.revenue?.trend || []).map((item: any) => ({
            month: item.month,
            revenue: item.revenue,
          })),
          branchRankings: (raw.revenue?.branch_rankings || []).map((item: any) => ({
            rank: item.rank,
            branchName: item.branch_name,
            rating: item.rating,
            revenue: item.revenue,
            members: item.members,
          })),
        },
        operations: {
          classUtilization: (raw.operations?.class_utilization || []).map((item: any) => ({
            classType: item.class_type,
            utilization: item.utilization,
          })),
          trainerProductivity: {
            averageSessionsPerTrainer: raw.operations?.trainer_productivity?.average_sessions_per_trainer ?? 0,
            memberSatisfaction: raw.operations?.trainer_productivity?.member_satisfaction ?? 0,
            ptPackageSales: raw.operations?.trainer_productivity?.pt_package_sales ?? 0,
          },
          addonPerformance: (raw.operations?.addon_performance || []).map((item: any) => ({
            name: item.name,
            revenue: item.revenue,
          })),
        }
      };
    }
  });

  return {
    ...query,
    data: query.data,
  };
}
