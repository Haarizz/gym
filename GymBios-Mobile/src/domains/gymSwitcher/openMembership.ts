import { router } from 'expo-router';

import type { GymMembership } from './gymMembershipsApi';
import { switchGym } from './switchGym';

/**
 * Opens Subscriptions for the member's membership at a gym — where they renew or change
 * plan — switching the app to that gym first if it's working in another one.
 */
export async function openMembershipAt(gym: Pick<GymMembership, 'tenantSlug' | 'branchId'>): Promise<void> {
  await switchGym(gym, { goHome: false });
  router.push('/(member)/membership' as any);
}
