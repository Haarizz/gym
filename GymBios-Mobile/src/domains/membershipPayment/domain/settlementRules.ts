import { formatCurrency } from '@/core/providers/currencyDefinitions';
import { i18n } from '@/core/i18n';
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
    return { ok: false, error: i18n.t('outstanding.nothingToPayNow') };
  }
  if (!balance.allowedPaymentMethods.includes(payment.paymentMethodUsed)) {
    return {
      ok: false,
      error: i18n.t('outstanding.methodNotAllowed', {
        method: payment.paymentMethodUsed,
        allowed: balance.allowedPaymentMethods.join(', '),
      }),
    };
  }
  if (payment.paymentBreakdown.length !== 1) {
    return { ok: false, error: i18n.t('outstanding.splitNotAllowed') };
  }
  if (Math.abs(payment.summary.paidAmount - balance.payableAmount) > 0.005) {
    return {
      ok: false,
      error: i18n.t('outstanding.payFull', { amount: formatAmount(balance.payableAmount) }),
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
      return i18n.t('outstanding.blockedApprovalPending');
    case 'NO_PAYABLE_BILLS':
      return i18n.t('outstanding.blockedNoBills');
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
