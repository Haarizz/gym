import { toast } from '@/shared/components/Toasts/toastStore';

import { familyApi } from '../infrastructure/familyApi';

/**
 * Runs right after a member logs in or signs up: claims any Family/Couple
 * membership someone bought for this account's email, and — when the member has
 * no gym yet — switches the app to that gym so it shows as active straight away.
 * If they already hold their own membership at that gym, the backend keeps it and
 * skips the invitation. Best-effort: failures are left for the next login.
 */
export async function claimPendingFamilyInvitations(
  activeTenant: string | null,
  setActiveTenant: (tenant: string) => void,
): Promise<void> {
  let results;
  try {
    results = await familyApi.claimPendingInvitations();
  } catch (e) {
    console.error('Failed to claim family invitations', e);
    return;
  }

  const claimed = results.filter((r) => r.status === 'CLAIMED');
  if (claimed.length > 0 && !activeTenant) {
    setActiveTenant(claimed[0].tenantSlug);
  }
  for (const r of claimed) {
    const gym = r.gymName ?? 'your gym';
    toast.success(`${r.inviterName ?? 'A family member'} added you to their ${r.planName ?? 'family'} membership at ${gym}.`);
  }
  for (const r of results.filter((x) => x.status === 'SKIPPED_EXISTING_MEMBERSHIP')) {
    toast.info(`You already have a membership at ${r.gymName ?? 'this gym'}, so it stays active instead of the family subscription.`);
  }
}
