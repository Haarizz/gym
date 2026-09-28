import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/domains/profile';
import type { MemberDashboardData } from '../domain/MemberDashboardData';
import { memberDashboardRepository } from '../infrastructure/ApiMemberDashboardRepository';
import { dashboardKeys } from './useStaffDashboard';
import { useBranchContext } from "@/shared/providers/BranchProvider";
import { useAuthStore } from '@/domains/auth/store/authStore';

export const DEFAULT_MEMBER_DASHBOARD: MemberDashboardData = {
  memberInfo: {
    name: 'Member',
    role: 'Member',
    gymName: 'Unassigned',
    membershipType: 'No Active Plan',
    daysRemaining: 0,
    validUntil: '',
    isActive: false,
    isFrozen: false,
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
  const { selectedBranchId } = useBranchContext();
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const { profile } = useProfile();

  const query = useQuery({
    // activeTenant is part of the key: buying a plan switches the tenant, and the
    // previous tenant's (or no tenant's) "No Active Plan" must not be reused.
    queryKey: [...dashboardKeys.all, 'member', activeTenant, selectedBranchId],
    // Errors propagate instead of resolving to the fallback, so a failed fetch
    // (e.g. 403 before tenant/approval settles) isn't cached as a fresh
    // "No Active Plan" for the whole staleTime and is retried on next mount.
    queryFn: async (): Promise<MemberDashboardData> => {
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
    },
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? {
      ...DEFAULT_MEMBER_DASHBOARD,
      memberInfo: {
        ...DEFAULT_MEMBER_DASHBOARD.memberInfo,
        name: profile?.name || DEFAULT_MEMBER_DASHBOARD.memberInfo.name,
        gymName: profile?.branch || DEFAULT_MEMBER_DASHBOARD.memberInfo.gymName,
      },
    },
  };
}
