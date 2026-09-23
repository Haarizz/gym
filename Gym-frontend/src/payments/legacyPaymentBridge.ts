/**
 * Bridges the new ordered payment-line list onto the POS backend's existing
 * single paymentMethod + paymentBreakdown[] shape, so checkout keeps posting
 * correctly against a server that has not yet adopted paymentAllocations.
 * Remove once the backend consumes paymentAllocations directly.
 */

import { PAYMENT_TYPES, PaymentLine } from "./paymentModel";
import { paymentMethodsUsed } from "./paymentSelectors";

const LEG_METHOD_BY_TYPE: Record<string, string> = {
  [PAYMENT_TYPES.CASH]: "Cash",
  [PAYMENT_TYPES.CARD]: "Card",
  [PAYMENT_TYPES.ONLINE]: "Online Payment",
  [PAYMENT_TYPES.CREDIT]: "Credit",
};

export interface LegacyPaymentBreakdownLeg {
  method: string;
  amount: number;
  reference?: string;
}

export interface LegacyPayment {
  paymentMethod: "CASH" | "CARD" | "ONLINE" | "WALLET" | "CHEQUE" | "MIXED";
  paymentBreakdown: LegacyPaymentBreakdownLeg[] | undefined;
}

/** A single-method sale maps to its own enum value; two or more methods map to MIXED. */
export function toLegacyPayment(lines: PaymentLine[]): LegacyPayment {
  const methods = paymentMethodsUsed(lines);
  const breakdown: LegacyPaymentBreakdownLeg[] = lines.map((line) => ({
    method: LEG_METHOD_BY_TYPE[line.paymentType] ?? line.paymentType,
    amount: line.amount,
    ...(line.reference ? { reference: line.reference } : {}),
  }));

  if (methods.length <= 1) {
    const only = lines[0];
    const single: Record<string, LegacyPayment["paymentMethod"]> = {
      [PAYMENT_TYPES.CASH]: "CASH",
      [PAYMENT_TYPES.CARD]: "CARD",
      [PAYMENT_TYPES.ONLINE]: "ONLINE",
      [PAYMENT_TYPES.CREDIT]: "CASH",
    };
    return {
      paymentMethod: only ? single[only.paymentType] ?? "CASH" : "CASH",
      paymentBreakdown: undefined,
    };
  }

  return { paymentMethod: "MIXED", paymentBreakdown: breakdown };
}
