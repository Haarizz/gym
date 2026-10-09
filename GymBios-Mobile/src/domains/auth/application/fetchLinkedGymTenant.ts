import { apiClient } from '@/core/network/apiClient';

interface LinkedGym {
  tenantSlug: string;
  active: boolean;
}

/**
 * The gym a global member belongs to, read from the server's membership index.
 * The app normally keeps the active tenant on the device, but that is lost when
 * the app is reinstalled or the member moves to a new phone. Without it, every
 * request would miss their gym's database and the dashboard would show
 * "No Active Subscription". Prefers an active membership; null if the account
 * has no gym yet or the lookup fails (best-effort, retried on the next login).
 */
export async function fetchLinkedGymTenant(): Promise<string | null> {
  try {
    const response = await apiClient.get<LinkedGym[]>('/mobile/profile/memberships', {
      skipGlobalErrorToast: true,
    });
    const gyms = response.data ?? [];
    return (gyms.find((g) => g.active) ?? gyms[0])?.tenantSlug ?? null;
  } catch (e) {
    console.error('Failed to fetch linked gyms', e);
    return null;
  }
}
