import { queryClient } from '@/core/providers/QueryProvider';
import { fetchMyGymMemberships, gymMembershipKeys } from '@/domains/gymSwitcher/gymMembershipsApi';

export type LinkedGymChoice =
  | { kind: 'none' }
  | { kind: 'single'; tenantSlug: string }
  | { kind: 'choose' };

/**
 * Which gym a global member should land in when none is stored on this device.
 *
 * The app normally keeps the active gym on the device, but that is lost when the
 * app is reinstalled or the member moves to a new phone. Without it, every request
 * would miss their gym's database and the dashboard would show "No Active
 * Subscription". One gym is selected directly; with several, the member is asked
 * (gym picker). 'none' if the account has no gym yet or the lookup fails
 * (best-effort, retried on the next sign-in).
 *
 * The list is put in the query cache, so the picker shows it without a second request.
 */
export async function fetchLinkedGymChoice(userId: string): Promise<LinkedGymChoice> {
  try {
    const gyms = await fetchMyGymMemberships();
    queryClient.setQueryData(gymMembershipKeys.mine(userId), gyms);
    if (gyms.length === 1) {
      return { kind: 'single', tenantSlug: gyms[0].tenantSlug };
    }
    return gyms.length > 1 ? { kind: 'choose' } : { kind: 'none' };
  } catch (e) {
    console.error('Failed to fetch linked gyms', e);
    return { kind: 'none' };
  }
}
