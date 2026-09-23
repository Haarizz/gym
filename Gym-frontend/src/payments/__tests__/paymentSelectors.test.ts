import { describe, expect, it } from "vitest";
import { PAYMENT_TYPES, createPaymentLine } from "../paymentModel";
import {
  allocationTarget,
  canSettle,
  changeAmount,
  duplicateCardReferences,
  isFullyAllocated,
  isOverAllocated,
  paymentMethodsUsed,
  paymentSummary,
  remainingBalance,
} from "../paymentSelectors";

const cash = (amount: number) => createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount });
const card = (amount: number, subtype = "Visa", reference: string | null = null) =>
  createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, paymentSubtype: subtype, amount, reference });
const online = (amount: number, bankAccountId = "1") =>
  createPaymentLine({ paymentType: PAYMENT_TYPES.ONLINE, amount, bankAccountId });
const credit = (amount: number, customerCode = "C1") =>
  createPaymentLine({ paymentType: PAYMENT_TYPES.CREDIT, amount, customerCode });

describe("remainingBalance", () => {
  it("subtracts everything allocated, including credit", () => {
    expect(remainingBalance([cash(20), credit(30)], 100)).toBe(50);
  });

  it("clamps at 0 rather than going negative when cash overpays", () => {
    expect(remainingBalance([cash(150)], 100)).toBe(0);
  });

  it("is 0 for a zero-total bill with no tenders at all", () => {
    expect(remainingBalance([], 0)).toBe(0);
  });
});

describe("changeAmount", () => {
  it("is 0 when cash alone exactly covers the bill", () => {
    expect(changeAmount([cash(100)], 100)).toBe(0);
  });

  it("returns the excess when cash alone overpays", () => {
    expect(changeAmount([cash(120)], 100)).toBe(20);
  });

  it("lets non-cash settle its part first, returning only cash beyond the leftover", () => {
    // Online 20 + Cash 90 against a 100 bill: leftover for cash after online is 80,
    // so 10 of the 90 cash tendered is change.
    expect(changeAmount([online(20), cash(90)], 100)).toBe(10);
  });

  it("is 0 when non-cash alone already exceeds the bill (no cash tendered)", () => {
    expect(changeAmount([online(20), card(90)], 100)).toBe(0);
  });
});

describe("paymentMethodsUsed / paymentSummary", () => {
  it("lists labels in entry order, de-duplicated", () => {
    expect(paymentMethodsUsed([cash(10), cash(10), card(10, "Visa")])).toEqual(["Cash", "Visa"]);
  });

  it("builds the acceptance-example summary in entry order, never alphabetical", () => {
    const lines = [online(20), cash(50), card(30, "Visa")];
    expect(paymentSummary(lines)).toBe("Online + Cash + Visa");
  });

  it("is null with no lines", () => {
    expect(paymentSummary([])).toBeNull();
  });

  it("never produces the string Mixed", () => {
    const lines = [cash(10), card(20, "Visa"), online(30), credit(40)];
    expect(paymentSummary(lines)).not.toMatch(/mixed/i);
  });
});

describe("isFullyAllocated / isOverAllocated / canSettle", () => {
  it("under-allocated: not settleable", () => {
    const lines = [cash(50)];
    expect(isFullyAllocated(lines, 100)).toBe(false);
    expect(canSettle(lines, 100)).toBe(false);
  });

  it("over-allocated on non-cash: blocking error, not settleable", () => {
    const lines = [card(120, "Visa")];
    expect(isOverAllocated(lines, 100)).toBe(true);
    expect(canSettle(lines, 100)).toBe(false);
  });

  it("cash overpaying alone is not 'over-allocated' (only non-cash triggers it)", () => {
    const lines = [cash(120)];
    expect(isOverAllocated(lines, 100)).toBe(false);
    expect(canSettle(lines, 100)).toBe(true);
  });

  it("incomplete line (e.g. CARD with no subtype) blocks settlement even if the sum is right", () => {
    const incompleteCard = createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, amount: 100 });
    expect(canSettle([incompleteCard], 100)).toBe(false);
  });

  it("fully allocated, in-tolerance, zero line errors: settleable", () => {
    const lines = [online(20), cash(50), card(30, "Visa")];
    expect(isFullyAllocated(lines, 100)).toBe(true);
    expect(canSettle(lines, 100)).toBe(true);
  });

  it("a zero-total bill is complete with no tender at all", () => {
    expect(isFullyAllocated([], 0)).toBe(true);
    expect(canSettle([], 0)).toBe(true);
  });

  it("tolerance absorbs sub-cent rounding without flipping the comparison", () => {
    const lines = [cash(33.33), cash(33.33), cash(33.34)];
    expect(isFullyAllocated(lines, 100)).toBe(true);
  });
});

describe("duplicateCardReferences", () => {
  it("flags the same auth code reused across two card lines", () => {
    const lines = [card(20, "Visa", "AUTH123"), card(30, "Mastercard", "AUTH123")];
    expect(duplicateCardReferences(lines)).toEqual(["AUTH123"]);
  });

  it("does not flag distinct references", () => {
    const lines = [card(20, "Visa", "AUTH123"), card(30, "Mastercard", "AUTH456")];
    expect(duplicateCardReferences(lines)).toEqual([]);
  });

  it("ignores empty/missing references", () => {
    const lines = [card(20, "Visa", null), card(30, "Mastercard", null)];
    expect(duplicateCardReferences(lines)).toEqual([]);
  });
});

describe("allocationTarget", () => {
  it("equals remaining when not editing", () => {
    expect(allocationTarget(40, null)).toBe(40);
  });

  it("adds the edited line's own amount back in, so reopening a fully-allocating line still shows its own amount as the target", () => {
    // Line already allocates 100 against a 100 bill -> remaining is 0.
    // Reopening it to edit must show a target of 100, not 0.
    expect(allocationTarget(0, { amount: 100 })).toBe(100);
  });

  it("adds back a partial edited amount on top of the true remaining", () => {
    // Bill 100, this cash line already contributes 30, so true remaining (excluding it) is 70.
    // remaining passed in already excludes it and sits at 70; target should be 70 + 30 = 100.
    expect(allocationTarget(70, { amount: 30 })).toBe(100);
  });
});
