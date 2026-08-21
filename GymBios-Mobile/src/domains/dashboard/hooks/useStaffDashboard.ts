import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/domains/profile';
import type { StaffDashboardData } from '../domain/StaffDashboardData';
import { staffDashboardRepository } from '../infrastructure/ApiStaffDashboardRepository';

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
  const { profile } = useProfile();

  const query = useQuery({
    queryKey: dashboardKeys.staff(),
    queryFn: async (): Promise<StaffDashboardData> => {
      try {
        const data = await staffDashboardRepository.getStaffDashboard();
        return {
          ...data,
          staffInfo: {
            name: data.staffInfo?.name || profile?.name || DEFAULT_STAFF_DASHBOARD.staffInfo.name,
            role: data.staffInfo?.role || profile?.role || DEFAULT_STAFF_DASHBOARD.staffInfo.role,
            branch: data.staffInfo?.branch || profile?.branch || DEFAULT_STAFF_DASHBOARD.staffInfo.branch,
          },
          todaysStats: data.todaysStats ?? DEFAULT_STAFF_DASHBOARD.todaysStats,
          urgentFollowUps: Array.isArray(data.urgentFollowUps) ? data.urgentFollowUps : [],
          recentConversions: Array.isArray(data.recentConversions) ? data.recentConversions : [],
          monthlySummary: data.monthlySummary ?? DEFAULT_STAFF_DASHBOARD.monthlySummary,
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
