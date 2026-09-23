import { describe, expect, it } from "vitest";
import { PAYMENT_TYPES } from "../paymentModel";
import { confirmActionLabel, remainingAfterAllocation, suggestedNextMethod } from "../paymentFlow";

describe("suggestedNextMethod", () => {
  it("is null when the payment settles the bill", () => {
    expect(suggestedNextMethod(PAYMENT_TYPES.CASH, 0)).toBeNull();
  });

  it("skips the current type — a cashier short on cash should not be sent back to cash", () => {
    const next = suggestedNextMethod(PAYMENT_TYPES.CASH, 50);
    expect(next).not.toBe(PAYMENT_TYPES.CASH);
    expect(next).toBe(PAYMENT_TYPES.CARD);
  });

  it("follows CASH, CARD, ONLINE, CREDIT priority order", () => {
    expect(suggestedNextMethod(PAYMENT_TYPES.CARD, 50)).toBe(PAYMENT_TYPES.CASH);
    expect(suggestedNextMethod(PAYMENT_TYPES.ONLINE, 50)).toBe(PAYMENT_TYPES.CASH);
    expect(suggestedNextMethod(PAYMENT_TYPES.CREDIT, 50)).toBe(PAYMENT_TYPES.CASH);
  });

  it("respects offeredTypes, e.g. excluding CREDIT for a balance that cannot go on account", () => {
    const offered = [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE];
    const next = suggestedNextMethod(PAYMENT_TYPES.CASH, 50, offered);
    expect(next).toBe(PAYMENT_TYPES.CARD);
    expect(next).not.toBe(PAYMENT_TYPES.CREDIT);
  });

  it("is null when offeredTypes excludes everything but the current type", () => {
    expect(suggestedNextMethod(PAYMENT_TYPES.CASH, 50, [PAYMENT_TYPES.CASH])).toBeNull();
  });
});

describe("confirmActionLabel", () => {
  it("reads 'Confirm {Type}' when the tender settles the bill", () => {
    expect(confirmActionLabel({ currentType: PAYMENT_TYPES.CARD, remainingAfter: 0 })).toBe("Confirm Card");
  });

  it("reads 'Confirm & Continue to {Next}' when a balance remains", () => {
    expect(confirmActionLabel({ currentType: PAYMENT_TYPES.ONLINE, remainingAfter: 30 })).toBe(
      "Confirm & Continue to Cash"
    );
  });

  it("reads 'Save {Type}' when editing, regardless of remaining balance", () => {
    expect(
      confirmActionLabel({ currentType: PAYMENT_TYPES.CARD, remainingAfter: 30, editing: true })
    ).toBe("Save Card");
  });

  it("editing never chains onward even when it would otherwise settle the bill", () => {
    const label = confirmActionLabel({ currentType: PAYMENT_TYPES.CASH, remainingAfter: 0, editing: true });
    expect(label).toBe("Save Cash");
  });
});

describe("remainingAfterAllocation", () => {
  it("subtracts the tendered amount from the target", () => {
    expect(remainingAfterAllocation(100, 30)).toBe(70);
  });

  it("clamps at 0 when the amount meets or exceeds the target", () => {
    expect(remainingAfterAllocation(100, 100)).toBe(0);
    expect(remainingAfterAllocation(100, 150)).toBe(0);
  });
});
