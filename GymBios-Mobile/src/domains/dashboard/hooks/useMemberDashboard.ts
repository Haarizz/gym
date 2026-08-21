import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/domains/profile';
import type { MemberDashboardData } from '../domain/MemberDashboardData';
import { memberDashboardRepository } from '../infrastructure/ApiMemberDashboardRepository';
import { dashboardKeys } from './useStaffDashboard';

export const DEFAULT_MEMBER_DASHBOARD: MemberDashboardData = {
  memberInfo: {
    name: 'Member',
    role: 'Active Member',
    gymName: 'FitZone Downtown',
    membershipType: 'Standard Plan',
    daysRemaining: 180,
    validUntil: '2026-12-31',
    isActive: true,
  },
  todaysSchedule: [],
  quickStats: [
    { label: 'Check-ins', value: '0', icon: 'check-circle', color: '#327f74' },
    { label: 'Classes', value: '0', icon: 'calendar', color: '#F5C742' },
    { label: 'Calories', value: '0', icon: 'zap', color: '#F59E0B' },
    { label: 'Streak', value: '0 days', icon: 'award', color: '#8b5cf6' },
  ],
};

export function useMemberDashboard() {
  const { profile } = useProfile();

  const query = useQuery({
    queryKey: [...dashboardKeys.all, 'member'],
    queryFn: async (): Promise<MemberDashboardData> => {
      try {
        const data = await memberDashboardRepository.getMemberDashboard();
        return {
          ...data,
          memberInfo: {
            ...data.memberInfo,
            name: profile?.name || data.memberInfo?.name || DEFAULT_MEMBER_DASHBOARD.memberInfo.name,
            gymName: profile?.branch || data.memberInfo?.gymName || DEFAULT_MEMBER_DASHBOARD.memberInfo.gymName,
          },
          todaysSchedule: Array.isArray(data.todaysSchedule) ? data.todaysSchedule : [],
          quickStats: Array.isArray(data.quickStats) ? data.quickStats : DEFAULT_MEMBER_DASHBOARD.quickStats,
        };
      } catch {
        return {
          ...DEFAULT_MEMBER_DASHBOARD,
          memberInfo: {
            ...DEFAULT_MEMBER_DASHBOARD.memberInfo,
            name: profile?.name || DEFAULT_MEMBER_DASHBOARD.memberInfo.name,
            gymName: profile?.branch || DEFAULT_MEMBER_DASHBOARD.memberInfo.gymName,
          },
        };
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_MEMBER_DASHBOARD,
  };
}
