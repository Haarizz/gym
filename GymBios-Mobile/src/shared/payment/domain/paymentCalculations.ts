import { METHOD_API_TITLES, ONLINE_PAYMENT_TYPE_LABELS } from '../constants';
import type { DiscountType, OnlineMethodType, PaymentSplit } from '../types';

export function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (subtotal <= 0 || discountValue <= 0 || discountType === 'none') {
    return 0;
  }
  if (discountType === 'fixed') {
    return Math.min(subtotal, discountValue);
  }
  if (discountType === 'percentage') {
    const calculated = (subtotal * discountValue) / 100;
    return Math.min(subtotal, Math.max(0, calculated));
  }
  return 0;
}

export function calculateTotals(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
  paidAmountInput: number,
) {
  const safeSubtotal = Math.max(0, subtotal);
  const discountAmount = calculateDiscountAmount(
    safeSubtotal,
    discountType,
    discountValue,
  );
  const finalAmount = Math.max(0, safeSubtotal - discountAmount);
  const safePaidAmount = Math.max(0, paidAmountInput);

  const remainingAmount = Math.max(0, finalAmount - safePaidAmount);
  const payBackAmount = Math.max(0, safePaidAmount - finalAmount);

  return {
    subtotal: safeSubtotal,
    discountAmount,
    finalAmount,
    paidAmount: safePaidAmount,
    remainingAmount,
    payBackAmount,
  };
}

/** Rounds to cents so split amounts always add back up to the total. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The leg for a payment Stripe collected; the intent id is what the backend verifies. */
export function onlineLeg(methodType: OnlineMethodType, amount: number, paymentIntentId: string): PaymentSplit {
  return {
    method: METHOD_API_TITLES[methodType],
    amount: roundMoney(amount),
    onlinePaymentType: ONLINE_PAYMENT_TYPE_LABELS[methodType],
    providerName: 'Stripe',
    reference: paymentIntentId,
    stripePaymentIntentId: paymentIntentId,
  };
}
