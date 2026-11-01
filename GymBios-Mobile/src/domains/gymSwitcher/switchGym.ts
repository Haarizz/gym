import { router } from 'expo-router';

import { setApiClientBranch } from '@/core/network/apiClient';
import { queryClient } from '@/core/providers/QueryProvider';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { getRoleHomeHref } from '@/domains/auth/presentation/navigation/routes';

import type { GymMembership } from './gymMembershipsApi';

interface SwitchGymOptions {
  /** Open the member home afterwards (default). Off when the caller navigates itself. */
  goHome?: boolean;
}

/**
 * Makes another of the member's gyms the one the app works in.
 *
 * Every gym-scoped screen reads from that gym's database (X-Tenant-ID) and is filtered
 * to the member's branch there (X-Active-Branch-Id). Both headers are set before
 * anything refetches — a branch id from the previous gym would filter the new gym's
 * data to the wrong branch. Almost none of the cached queries are keyed by gym, so the
 * whole cache is reset, or the previous gym's plan, check-ins and schedule would show
 * until each query refetched.
 */
export async function switchGym(gym: Pick<GymMembership, 'tenantSlug' | 'branchId'>,
                                { goHome = true }: SwitchGymOptions = {}): Promise<void> {
  const { activeTenant, setActiveTenant } = useAuthStore.getState();
  if (gym.tenantSlug === activeTenant) {
    return;
  }
  setActiveTenant(gym.tenantSlug);
  // Unknown branch: send none, and BranchProvider fills it in from the member record.
  setApiClientBranch(gym.branchId ?? 'ALL');
  if (goHome) {
    router.replace(getRoleHomeHref('member'));
  }
  // Clears every cached query and refetches the ones on screen against the new gym.
  // Not awaited: callers navigate on, and each screen shows its own loading state.
  void queryClient.resetQueries();
}
