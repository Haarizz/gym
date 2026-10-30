/**
 * Deep links reaching the app before Expo Router navigates. Stripe returns here
 * (gymbiosmobile://stripe-redirect) after a UPI or net banking approval in another app
 * or the browser. The Stripe SDK picks that link up itself, and the payment sheet is
 * still open underneath, so the router must not navigate anywhere for it.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (path.includes('stripe-redirect')) {
    return initial ? '/' : null;
  }
  return path;
}
