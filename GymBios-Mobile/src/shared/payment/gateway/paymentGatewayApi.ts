import { apiClient } from '@/core/network/apiClient';

import type { OnlineMethodType } from '../types';

export interface CreateIntentRequest {
  amount: number;
  methodType: OnlineMethodType;
  /** The gym being paid — not always the app's current gym (first purchases). */
  tenantSlug: string;
  /** Shown on the Stripe dashboard, e.g. "Golden membership". */
  purpose?: string;
}

export interface CreatedIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  /** The gym's billing currency, decided by the server. */
  currency: string;
  /** Local backend simulation: no Stripe sheet, the app shows its own test screen. */
  simulated: boolean;
}

export const paymentGatewayApi = {
  async createIntent(request: CreateIntentRequest): Promise<CreatedIntent> {
    const response = await apiClient.post<{
      payment_intent_id: string;
      client_secret: string;
      amount: number;
      currency: string;
      simulated?: boolean;
    }>(
      '/mobile/payments/stripe/intents',
      {
        amount: request.amount,
        method_type: request.methodType,
        tenant_slug: request.tenantSlug,
        purpose: request.purpose,
      },
      // The payment sheet shows its own error state.
      { skipGlobalErrorToast: true },
    );
    return {
      paymentIntentId: response.data.payment_intent_id,
      clientSecret: response.data.client_secret,
      amount: Number(response.data.amount),
      currency: response.data.currency,
      simulated: response.data.simulated === true,
    };
  },
};
