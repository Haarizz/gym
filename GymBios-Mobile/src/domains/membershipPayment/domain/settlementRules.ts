import { formatCurrency } from '@/core/providers/currencyDefinitions';
import type { PaymentResult } from '@/shared/payment/types';
import type { OutstandingBalance, PayBlockedReason, SettleOutstandingBalanceRequest } from './types';

export type SettlementRequestResult =
  | { ok: true; request: SettleOutstandingBalanceRequest }
  | { ok: false; error: string };

/**
 * Turns what the member entered in PaymentBottomSheet into a settlement request.
 * The sheet is shared with purchase flows, so it offers options a settlement
 * can't use (Cash/Credit/Mixed, partial amounts) — those are caught here with a
 * clear message. The backend enforces the same rules independently.
 */
export function buildSettlementRequest(
  balance: OutstandingBalance,
  payment: PaymentResult,
): SettlementRequestResult {
  if (!balance.canPay || balance.payableAmount <= 0) {
    return { ok: false, error: 'There is nothing to pay right now.' };
  }
  if (!balance.allowedPaymentMethods.includes(payment.paymentMethodUsed)) {
    return {
      ok: false,
      error: `${payment.paymentMethodUsed} can't be used in the app. Choose ${balance.allowedPaymentMethods.join(', ')}, or pay at reception.`,
    };
  }
  if (payment.paymentBreakdown.length !== 1) {
    return { ok: false, error: 'Split payments must be made at reception.' };
  }
  if (Math.abs(payment.summary.paidAmount - balance.payableAmount) > 0.005) {
    return {
      ok: false,
      error: `Please pay the full outstanding balance of ${formatAmount(balance.payableAmount)}.`,
    };
  }
  return {
    ok: true,
    request: {
      expectedAmount: balance.payableAmount,
      paymentMethodUsed: payment.paymentMethodUsed,
      paymentBreakdown: payment.paymentBreakdown,
    },
  };
}

/** Whether the membership screen should show the payment section at all. */
export function hasOutstandingBalance(balance: OutstandingBalance | undefined): balance is OutstandingBalance {
  return !!balance && balance.membershipId !== null && balance.outstandingAmount > 0;
}

export function payBlockedMessage(reason: PayBlockedReason | null): string | null {
  switch (reason) {
    case 'APPROVAL_PENDING':
      return 'Your membership payment is awaiting approval by the gym.';
    case 'NO_PAYABLE_BILLS':
      return 'This balance can’t be paid in the app. Please pay at reception.';
    default:
      return null;
  }
}

/**
 * Plain-text amount for messages/toasts, in the gym's display currency (web
 * Settings page). The API's own currencySymbol is the accounting base currency,
 * so it is deliberately not used for display. On-screen amounts use <CurrencyValue>.
 */
export function formatAmount(amount: number): string {
  return formatCurrency(amount, { maximumFractionDigits: 2 });
}
