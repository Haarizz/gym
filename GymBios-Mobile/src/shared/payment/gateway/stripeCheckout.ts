import * as Linking from 'expo-linking';
import { initPaymentSheet, initStripe, PaymentSheetError, presentPaymentSheet } from '@stripe/stripe-react-native';

import { env } from '@/core/platform/config/env';

import type { OnlineMethodType } from '../types';
import { paymentGatewayApi } from './paymentGatewayApi';

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

/** Stripe opens other apps / the browser for UPI and net banking, then returns here. */
const RETURN_URL = Linking.createURL('stripe-redirect');

let initialised: Promise<void> | null = null;

function ensureStripe(): Promise<void> {
  initialised ??= initStripe({
    publishableKey: env.stripePublishableKey,
    urlScheme: Linking.createURL('').replace(/:\/\/.*$/, ''),
  }).catch((error) => {
    initialised = null;
    throw error;
  });
  return initialised;
}

/** Whether Card / UPI / Net banking can be offered at all on this build. */
export function isOnlinePaymentAvailable(): boolean {
  return env.stripePublishableKey.length > 0;
}

/**
 * Runs one Stripe payment end to end: the server creates the PaymentIntent (in the
 * gym's currency), Stripe's own sheet collects and confirms it. Nothing is typed into
 * our UI. The returned intent id goes on the payment leg, and the backend verifies it
 * with Stripe before trusting it.
 */
export async function payOnline(request: OnlinePaymentRequest, hooks: OnlinePaymentHooks): Promise<OnlinePaymentOutcome> {
  try {
    const intent = await paymentGatewayApi.createIntent(request);

    if (intent.simulated) {
      const decision = await hooks.onSimulated(intent);
      if (decision === 'approve') return { status: 'succeeded', paymentIntentId: intent.paymentIntentId };
      if (decision === 'decline') return { status: 'failed', message: 'Test payment declined' };
      return { status: 'canceled' };
    }

    await ensureStripe();

    const init = await initPaymentSheet({
      merchantDisplayName: 'GymBios',
      paymentIntentClientSecret: intent.clientSecret,
      returnURL: RETURN_URL,
      // Google Pay rides along with Card where the device supports it; testEnv until
      // the account is approved for production.
      googlePay:
        request.methodType === 'card'
          ? { merchantCountryCode: countryFor(intent.currency), currencyCode: intent.currency, testEnv: __DEV__ }
          : undefined,
    });
    if (init.error) {
      return { status: 'failed', message: init.error.localizedMessage ?? init.error.message };
    }

    const result = await presentPaymentSheet();
    if (result.error) {
      if (result.error.code === PaymentSheetError.Canceled) return { status: 'canceled' };
      return { status: 'failed', message: result.error.localizedMessage ?? result.error.message };
    }
    return { status: 'succeeded', paymentIntentId: intent.paymentIntentId };
  } catch (error: any) {
    const message = error?.response?.data?.message ?? error?.message ?? 'Payment could not be started';
    return { status: 'failed', message };
  }
}

/** Google Pay wants the merchant's country; the gym's currency is the best signal we have. */
function countryFor(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'INR': return 'IN';
    case 'SAR': return 'SA';
    case 'USD': return 'US';
    case 'GBP': return 'GB';
    case 'EUR': return 'DE';
    default: return 'AE';
  }
}
