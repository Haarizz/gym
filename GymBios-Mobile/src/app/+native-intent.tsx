import { useAuthStore } from '@/domains/auth/store/authStore';
import {
  parseReferralLink,
  usePendingReferralCodeStore,
} from '@/domains/member-referrals/store/pendingReferralCodeStore';

/**
 * Deep links reaching the app before Expo Router navigates.
 *
 * Stripe returns here (gymbiosmobile://stripe-redirect) after a UPI or net banking
 * approval in another app or the browser. The Stripe SDK picks that link up itself, and
 * the payment sheet is still open underneath, so the router must not navigate anywhere for it.
 *
 * Referral links (gymbiosmobile://ref/<code> from the web landing page's "Open in app"
 * button, or https://<web>/ref/<code> once app links are verified) have no screen of their
 * own: the code is parked in pendingReferralCodeStore and member home opens the claim
 * sheet with it. A signed-out user keeps it until they sign in or finish onboarding.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (path.includes('stripe-redirect')) {
    return initial ? '/' : null;
  }

  const referralCode = parseReferralLink(path);
  if (referralCode) {
    usePendingReferralCodeStore.getState().setCode(referralCode);
    // Cold start: the splash screen routes as usual and member home picks the code up.
    if (initial) return '/';
    // Already running: a signed-in member goes home to the sheet; anyone else stays put
    // (e.g. mid sign-up) and meets the sheet after onboarding.
    return useAuthStore.getState().appRole === 'member' ? '/(member)' : null;
  }

  return path;
}
