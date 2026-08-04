import type { DiscountType, PaymentSplitRow } from '../types';

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

export function calculateSplitTotal(rows: PaymentSplitRow[]): number {
  return rows.reduce((sum, r) => sum + (r.amount || 0), 0);
}

export function validateSplitPayment(
  rows: PaymentSplitRow[],
  finalAmount: number,
): { isValid: boolean; difference: number } {
  const total = calculateSplitTotal(rows);
  const diff = Math.abs(total - finalAmount);
  return {
    isValid: diff < 0.01 && rows.length > 0,
    difference: total - finalAmount,
  };
}
