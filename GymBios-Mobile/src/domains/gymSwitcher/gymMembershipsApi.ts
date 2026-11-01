import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/network/apiClient';
import { queryClient } from '@/core/providers/QueryProvider';
import { useAuthStore } from '@/domains/auth/store/authStore';

import { switchGym } from './switchGym';

export type GymMembershipStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_APPROVAL'
  | 'PAYMENT_REJECTED'
  | 'UNAVAILABLE';

/** One gym this account holds a membership at — an entry in the gym switcher. */
export interface GymMembership {
  tenantSlug: string;
  /** Usable right now (status ACTIVE). */
  active: boolean;
  gymName: string;
  branchId: number | null;
  branchName: string | null;
  planName: string | null;
  status: GymMembershipStatus;
  /** ISO date (yyyy-MM-dd) the current period ends, if it has one. */
  expiryDate: string | null;
}

// The backend serializes JSON in snake_case.
interface GymMembershipApiModel {
  tenant_slug: string;
  active: boolean;
  gym_name?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  plan_name?: string | null;
  status?: string | null;
  expiry_date?: string | null;
}

function toGymMembership(m: GymMembershipApiModel): GymMembership {
  return {
    tenantSlug: m.tenant_slug,
    active: m.active,
    gymName: m.gym_name || m.tenant_slug,
    branchId: m.branch_id ?? null,
    branchName: m.branch_name ?? null,
    planName: m.plan_name ?? null,
    status: (m.status as GymMembershipStatus) ?? (m.active ? 'ACTIVE' : 'INACTIVE'),
    expiryDate: m.expiry_date ?? null,
  };
}

/**
 * Every gym this account is a member of, active ones first. Not tenant-scoped: the
 * server reads it from the cross-gym membership index, so it works with no gym chosen.
 */
export async function fetchMyGymMemberships(): Promise<GymMembership[]> {
  const response = await apiClient.get<GymMembershipApiModel[]>('/mobile/profile/memberships', {
    skipGlobalErrorToast: true,
  });
  return (response.data ?? []).map(toGymMembership);
}

export const gymMembershipKeys = {
  // Per account, so a cached list never carries over to the next person signing in.
  mine: (userId: string | undefined) => ['my-gym-memberships', userId ?? 'anonymous'] as const,
};

/** The signed-in member's gyms. Empty for staff, and while signed out. */
export function useMyGymMemberships() {
  const userId = useAuthStore((s) => s.user?.id);
  const isMember = useAuthStore((s) => s.appRole === 'member');
  return useQuery({
    queryKey: gymMembershipKeys.mine(userId),
    queryFn: fetchMyGymMemberships,
    enabled: isMember && !!userId,
    staleTime: 60_000,
  });
}

/** The cached list, or a fresh one when nothing is cached yet. Never throws. */
export async function getMyGymMemberships(): Promise<GymMembership[]> {
  const userId = useAuthStore.getState().user?.id;
  try {
    return await queryClient.fetchQuery({
      queryKey: gymMembershipKeys.mine(userId),
      queryFn: fetchMyGymMemberships,
      staleTime: 60_000,
    });
  } catch {
    return [];
  }
}

/** Refetch the member's gyms — after joining a gym, or a change to a membership's status. */
export function refreshMyGymMemberships(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ['my-gym-memberships'] });
}

/**
 * After a purchase or claim at a gym: make it the active gym (resetting the previous
 * gym's cached data, as any switch does) and refresh the gym list so the new
 * membership shows in the switcher.
 */
export async function enterPurchasedGym(tenantSlug: string, branchId: number | null): Promise<void> {
  await switchGym({ tenantSlug, branchId }, { goHome: false });
  await refreshMyGymMemberships();
}
