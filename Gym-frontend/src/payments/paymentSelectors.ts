/**
 * Pure, on-demand selectors over a payment-line list. Nothing here is ever
 * stored — the remaining balance shown on screen and the amount sent to the
 * server are always derived from the same `paymentLines` array, so they
 * cannot drift apart.
 */

import { AMOUNT_TOLERANCE, PAYMENT_TYPES, PaymentLine, PaymentType, lineLabel, validateLine } from "./paymentModel";

export function totalOfType(lines: PaymentLine[], type: PaymentType): number {
  return lines.filter((l) => l.paymentType === type).reduce((sum, l) => sum + l.amount, 0);
}

/** Credit is included — it is an allocation, just not a receipt. */
export function totalAllocated(lines: PaymentLine[]): number {
  return lines.reduce((sum, l) => sum + l.amount, 0);
}

export function totalNonCash(lines: PaymentLine[]): number {
  return lines.filter((l) => l.paymentType !== PAYMENT_TYPES.CASH).reduce((sum, l) => sum + l.amount, 0);
}

/** Clamped at 0 — cash tendered above the total is change, not a negative balance. */
export function remainingBalance(lines: PaymentLine[], total: number): number {
  return Math.max(0, total - totalAllocated(lines));
}

/**
 * Non-cash settles its part of the bill first; only whatever cash was
 * tendered beyond the leftover balance is handed back as change.
 */
export function changeAmount(lines: PaymentLine[], total: number): number {
  const cash = totalOfType(lines, PAYMENT_TYPES.CASH);
  const nonCash = totalNonCash(lines);
  const leftoverForCash = Math.max(0, total - nonCash);
  return Math.max(0, cash - leftoverForCash);
}

/** Labels in cashier entry order, de-duplicated. Never sorted alphabetically. */
export function paymentMethodsUsed(lines: PaymentLine[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const label = lineLabel(line);
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result;
}

/** "Cash", "Online + Cash + Visa", ... or null when nothing has been entered yet. Never "Mixed". */
export function paymentSummary(lines: PaymentLine[]): string | null {
  const methods = paymentMethodsUsed(lines);
  return methods.length ? methods.join(" + ") : null;
}

/** A zero-total bill is complete with no tender at all. */
export function isFullyAllocated(lines: PaymentLine[], total: number): boolean {
  return totalAllocated(lines) >= total - AMOUNT_TOLERANCE;
}

/** Card/Online/Credit cannot be given change, so over-allocating them is a blocking error. */
export function isOverAllocated(lines: PaymentLine[], total: number): boolean {
  return totalNonCash(lines) > total + AMOUNT_TOLERANCE;
}

/** The same auth code on two card lines almost always means a paste error. */
export function duplicateCardReferences(lines: PaymentLine[]): string[] {
  const refCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.paymentType !== PAYMENT_TYPES.CARD) continue;
    const ref = line.reference?.trim();
    if (!ref) continue;
    refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
  }
  return Array.from(refCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([ref]) => ref);
}

export function lineErrors(lines: PaymentLine[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const line of lines) {
    const error = validateLine(line);
    if (error) errors[line.id] = error;
  }
  const duplicates = new Set(duplicateCardReferences(lines));
  if (duplicates.size) {
    for (const line of lines) {
      if (line.paymentType === PAYMENT_TYPES.CARD && line.reference && duplicates.has(line.reference.trim())) {
        errors[line.id] = errors[line.id] ?? `Duplicate card reference "${line.reference.trim()}"`;
      }
    }
  }
  return errors;
}

export function canSettle(lines: PaymentLine[], total: number): boolean {
  if (!isFullyAllocated(lines, total)) return false;
  if (isOverAllocated(lines, total)) return false;
  if (Object.keys(lineErrors(lines)).length > 0) return false;
  return true;
}

/**
 * When editing, the line's own amount is already counted in `remaining`;
 * without adding it back, reopening a fully-allocating line would show a
 * remaining of zero and reject every amount typed.
 */
export function allocationTarget(remaining: number, editingLine?: Pick<PaymentLine, "amount"> | null): number {
  return remaining + (editingLine?.amount ?? 0);
}
