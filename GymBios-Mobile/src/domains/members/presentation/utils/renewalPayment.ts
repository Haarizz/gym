import type { PaymentResult, PaymentSplit } from '@/shared/payment';

export interface RenewalPaymentFields {
  amountReceived: number;
  paymentStatus: string;
  paymentMethod: string;
  paymentBreakdown?: PaymentSplit[];
  bankAccountCode?: string;
  bankAccountName?: string;
}

/**
 * Turns the shared payment sheet's result into the renewal endpoints' payment fields,
 * the same way the web admin renewal does: "Credit" is never a real method — it only
 * means nothing was received — and the per-leg breakdown is sent only for Mixed.
 */
export function toRenewalPayment(result: PaymentResult): RenewalPaymentFields {
  const { finalAmount, paidAmount } = result.summary;
  // Cash change handed back isn't revenue — never record more than the amount due.
  const amountReceived = Math.max(0, Math.min(paidAmount, finalAmount));
  const legs = result.paymentBreakdown.filter((leg) => leg.amount > 0);

  const paymentStatus =
    amountReceived >= finalAmount ? 'paid' : amountReceived > 0 ? 'partial' : 'pending';

  if (legs.length === 0) {
    return { amountReceived, paymentStatus, paymentMethod: 'Credit' };
  }
  if (legs.length === 1) {
    const [leg] = legs;
    return {
      amountReceived,
      paymentStatus,
      paymentMethod: leg.method,
      bankAccountCode: leg.bankAccountCode ?? result.bankAccountCode,
      bankAccountName: leg.bankAccountName ?? result.bankAccountName,
    };
  }
  return {
    amountReceived,
    paymentStatus,
    paymentMethod: 'Mixed',
    paymentBreakdown: legs,
  };
}
