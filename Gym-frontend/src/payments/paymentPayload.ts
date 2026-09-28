/**
 * Projects a payment-line list into the wire format the server expects: an
 * ordered list of allocations, plus the derived figures the post-checkout
 * flow needs. All money is rounded to 2dp by round2 — never left to whatever
 * floating point arithmetic produced.
 */

import { PAYMENT_TYPES, PaymentLine } from "./paymentModel";
import { changeAmount, paymentSummary, totalAllocated, totalOfType } from "./paymentSelectors";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface PaymentAllocationWire {
  type: PaymentLine["paymentType"];
  subtype: string | null;
  amount: number;
  reference: string | null;
  bankAccountName?: string | null;
}

export interface PaymentPayload {
  paymentAllocations: PaymentAllocationWire[];
  paymentMode: string;
  paymentSummary: string;
  changeDue: number;
  paidAmount: number;
  amountReceived: number;
  creditBalance: number;
  cashTaken: boolean;
  creditAccount: { code: string; name: string } | null;
}

/** Builds the payload sent to the server. `invoiceTotal` is the amount due net of any deposit already collected. */
export function buildPaymentPayload(lines: PaymentLine[], invoiceTotal: number): PaymentPayload {
  const allocations: PaymentAllocationWire[] = lines.map((line) => ({
    type: line.paymentType,
    subtype: line.paymentSubtype,
    amount: round2(line.amount),
    reference: line.reference,
    ...(line.paymentType === PAYMENT_TYPES.ONLINE ? { bankAccountName: line.bankAccountName } : {}),
  }));

  const summary = paymentSummary(lines) ?? "";
  const change = round2(changeAmount(lines, invoiceTotal));
  const creditBalance = round2(totalOfType(lines, PAYMENT_TYPES.CREDIT));
  const paidAmount = round2(totalAllocated(lines) - creditBalance - change);
  const cashTaken = totalOfType(lines, PAYMENT_TYPES.CASH) > 0;

  const creditLine = lines.find((l) => l.paymentType === PAYMENT_TYPES.CREDIT);

  return {
    paymentAllocations: allocations,
    paymentMode: summary,
    paymentSummary: summary,
    changeDue: change,
    paidAmount,
    amountReceived: paidAmount,
    creditBalance,
    cashTaken,
    creditAccount: creditLine ? { code: creditLine.customerCode ?? "", name: creditLine.customerName ?? "" } : null,
  };
}
