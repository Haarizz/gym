// Stripe's React Native SDK has no web build, so online methods are offered as
// unavailable on web; Cash and Credit still work there.
import type { OnlineMethodType } from '../types';

export type OnlinePaymentOutcome =
  | { status: 'succeeded'; paymentIntentId: string }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

export interface OnlinePaymentRequest {
  amount: number;
  methodType: OnlineMethodType;
  tenantSlug: string;
  purpose?: string;
}

/** What the person chose on the test screen of a simulated payment. */
export type SimulatedDecision = 'approve' | 'decline' | 'cancel';

export interface OnlinePaymentHooks {
  /** Shown instead of Stripe's sheet when the backend is simulating payments. */
  onSimulated: (intent: { paymentIntentId: string; amount: number; currency: string }) => Promise<SimulatedDecision>;
}

export function isOnlinePaymentAvailable(): boolean {
  return false;
}

export async function payOnline(_request: OnlinePaymentRequest, _hooks: OnlinePaymentHooks): Promise<OnlinePaymentOutcome> {
  return { status: 'failed', message: 'Online payments are available in the mobile app' };
}
