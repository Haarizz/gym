import { useMemo } from 'react';
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
    totalVisits: 0,
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
        todaysSchedule: Array.isArray(data.todaysSchedule) ? data.todaysSchedule : [],
        quickStats: Array.isArray(data.quickStats) ? data.quickStats : DEFAULT_MEMBER_DASHBOARD.quickStats,
      };
    },
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  // Profile overrides are applied outside queryFn: on first load the profile
  // may not have resolved yet, and baking the fallback (the username, for
  // members without a gym) into the cached response would stick until refetch.
  const data = useMemo<MemberDashboardData>(() => {
    const base = query.data ?? DEFAULT_MEMBER_DASHBOARD;
    return {
      ...base,
      memberInfo: {
        ...base.memberInfo,
        name: profile?.name || base.memberInfo?.name || DEFAULT_MEMBER_DASHBOARD.memberInfo.name,
        gymName: profile?.branch || base.memberInfo?.gymName || DEFAULT_MEMBER_DASHBOARD.memberInfo.gymName,
      },
    };
  }, [query.data, profile?.name, profile?.branch]);

  return {
    ...query,
    data,
  };
}
