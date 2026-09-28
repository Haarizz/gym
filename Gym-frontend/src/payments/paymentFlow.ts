/**
 * Pure flow rules governing tender chaining and confirm-button labeling.
 * Kept in one module, not inside each modal, so the four modals cannot
 * drift apart.
 */

import { AMOUNT_TOLERANCE, PAYMENT_TYPE_LABELS, PAYMENT_TYPES, PaymentType } from "./paymentModel";

/**
 * Cash first — it is what a customer reaches for when a card is declined or
 * short. Credit last — it collects no money and is the fallback of last
 * resort.
 */
export const NEXT_METHOD_PRIORITY: PaymentType[] = [
  PAYMENT_TYPES.CASH,
  PAYMENT_TYPES.CARD,
  PAYMENT_TYPES.ONLINE,
  PAYMENT_TYPES.CREDIT,
];

/**
 * Null when this payment settles the bill. Otherwise the first offered type
 * skipping the current one — a cashier who just keyed cash and still owes
 * money is short of cash, so re-opening the cash pad repeats the dead end.
 */
export function suggestedNextMethod(
  currentType: PaymentType,
  remainingAfter: number,
  offeredTypes: PaymentType[] = NEXT_METHOD_PRIORITY
): PaymentType | null {
  if (remainingAfter <= AMOUNT_TOLERANCE) return null;
  const next = NEXT_METHOD_PRIORITY.find((type) => type !== currentType && offeredTypes.includes(type));
  return next ?? null;
}

export interface ConfirmActionLabelArgs {
  currentType: PaymentType;
  remainingAfter: number;
  offeredTypes?: PaymentType[];
  editing?: boolean;
}

/**
 * "Confirm Card" when it settles, "Confirm & Continue to Cash" when a
 * balance remains, and "Save Card" when editing — editing never chains
 * onward, since the cashier came back to correct one line, not to start a
 * new tender.
 */
export function confirmActionLabel({
  currentType,
  remainingAfter,
  offeredTypes = NEXT_METHOD_PRIORITY,
  editing = false,
}: ConfirmActionLabelArgs): string {
  const typeLabel = PAYMENT_TYPE_LABELS[currentType];
  if (editing) {
    return `Save ${typeLabel}`;
  }
  const next = suggestedNextMethod(currentType, remainingAfter, offeredTypes);
  if (!next) {
    return `Confirm ${typeLabel}`;
  }
  return `Confirm & Continue to ${PAYMENT_TYPE_LABELS[next]}`;
}

export function remainingAfterAllocation(target: number, amount: number): number {
  return Math.max(0, target - Math.min(amount, target));
}
