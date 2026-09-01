import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/domains/profile';
import type { StaffDashboardData } from '../domain/StaffDashboardData';
import { staffDashboardRepository } from '../infrastructure/ApiStaffDashboardRepository';
import { useBranchContext } from "@/shared/providers/BranchProvider";

export const DEFAULT_STAFF_DASHBOARD: StaffDashboardData = {
  staffInfo: {
    name: 'Staff Member',
    role: 'Front Desk Executive',
    branch: 'Main Branch',
  },
  todaysStats: {
    leadsAdded: 0,
    followUpsCompleted: 0,
    conversions: 0,
    checkins: 0,
  },
  urgentFollowUps: [],
  recentConversions: [],
  monthlySummary: {
    targetAchievement: 0,
    totalConversions: 0,
    revenueGenerated: '₹0',
    conversionRate: 0,
  },
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  staff: () => [...dashboardKeys.all, 'staff'] as const,
};

export function useStaffDashboard() {
    const { selectedBranchId } = useBranchContext();
  const { profile } = useProfile();

  const query = useQuery({
    queryKey: [...(Array.isArray(dashboardKeys.staff()) ? dashboardKeys.staff() : [dashboardKeys.staff()]), selectedBranchId],
    queryFn: async (): Promise<StaffDashboardData> => {
      try {
        const data = await staffDashboardRepository.getStaffDashboard();
        const rawData = data as any;
        
        const staffInfo = rawData.staffInfo || rawData.staff_info || {};
        const todaysStats = rawData.todaysStats || rawData.todays_stats || {};
        const urgentFollowUps = rawData.urgentFollowUps || rawData.urgent_follow_ups || [];
        const recentConversions = rawData.recentConversions || rawData.recent_conversions || [];
        const monthlySummary = rawData.monthlySummary || rawData.monthly_summary || {};

        return {
          staffInfo: {
            name: staffInfo.name || profile?.name || DEFAULT_STAFF_DASHBOARD.staffInfo.name,
            role: staffInfo.role || profile?.role || DEFAULT_STAFF_DASHBOARD.staffInfo.role,
            branch: staffInfo.branch || profile?.branch || DEFAULT_STAFF_DASHBOARD.staffInfo.branch,
          },
          todaysStats: {
            leadsAdded: todaysStats.leadsAdded ?? todaysStats.leads_added ?? DEFAULT_STAFF_DASHBOARD.todaysStats.leadsAdded,
            followUpsCompleted: todaysStats.followUpsCompleted ?? todaysStats.follow_ups_completed ?? DEFAULT_STAFF_DASHBOARD.todaysStats.followUpsCompleted,
            conversions: todaysStats.conversions ?? DEFAULT_STAFF_DASHBOARD.todaysStats.conversions,
            checkins: todaysStats.checkins ?? DEFAULT_STAFF_DASHBOARD.todaysStats.checkins,
          },
          urgentFollowUps: Array.isArray(urgentFollowUps) ? urgentFollowUps.map(item => ({
            id: item.id,
            name: item.name || '',
            phone: item.phone || '',
            inquiry: item.inquiry || '',
            lastContact: item.lastContact || item.last_contact || 'Never',
            priority: item.priority || 'medium'
          })) : [],
          recentConversions: Array.isArray(recentConversions) ? recentConversions.map(item => ({
            id: item.id,
            name: item.name || '',
            plan: item.plan || '',
            amount: item.amount || '₹0'
          })) : [],
          monthlySummary: {
            targetAchievement: monthlySummary.targetAchievement ?? monthlySummary.target_achievement ?? DEFAULT_STAFF_DASHBOARD.monthlySummary.targetAchievement,
            totalConversions: monthlySummary.totalConversions ?? monthlySummary.total_conversions ?? DEFAULT_STAFF_DASHBOARD.monthlySummary.totalConversions,
            revenueGenerated: monthlySummary.revenueGenerated ?? monthlySummary.revenue_generated ?? DEFAULT_STAFF_DASHBOARD.monthlySummary.revenueGenerated,
            conversionRate: monthlySummary.conversionRate ?? monthlySummary.conversion_rate ?? DEFAULT_STAFF_DASHBOARD.monthlySummary.conversionRate,
          },
        };
      } catch {
        return {
          ...DEFAULT_STAFF_DASHBOARD,
          staffInfo: {
            name: profile?.name || DEFAULT_STAFF_DASHBOARD.staffInfo.name,
            role: profile?.role || DEFAULT_STAFF_DASHBOARD.staffInfo.role,
            branch: profile?.branch || DEFAULT_STAFF_DASHBOARD.staffInfo.branch,
          },
        };
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_STAFF_DASHBOARD,
  };
}
