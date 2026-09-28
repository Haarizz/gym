import { describe, expect, it } from "vitest";
import { PAYMENT_TYPES, createPaymentLine } from "../paymentModel";
import { resolveConfirm } from "../resolveConfirm";

describe("resolveConfirm — adding", () => {
  it("appends a single draft in order and chains to the next suggested tender when a balance remains", () => {
    const result = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.ONLINE, amount: 20 },
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 0,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.appends).toHaveLength(1);
    expect(result.appends[0].paymentType).toBe(PAYMENT_TYPES.ONLINE);
    expect(result.nextMethod).toBe(PAYMENT_TYPES.CASH);
  });

  it("does not chain once the draft fully settles the bill", () => {
    const result = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CASH, amount: 100 },
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 0,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.nextMethod).toBeNull();
  });

  it("walks the full acceptance scenario: Online 20 -> Cash 50 -> Card 30 against a 100 bill", () => {
    const offeredTypes = [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT];

    const step1 = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.ONLINE, amount: 20 },
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 0,
      offeredTypes,
    });
    expect(step1.nextMethod).toBe(PAYMENT_TYPES.CASH);

    const step2 = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CASH, amount: 50 },
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 20,
      offeredTypes,
    });
    // Cash is skipped as "current"; Card is next in priority order.
    expect(step2.nextMethod).toBe(PAYMENT_TYPES.CARD);

    const step3 = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CARD, amount: 30 },
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 70,
      offeredTypes,
    });
    expect(step3.nextMethod).toBeNull();
  });

  it("handles a Credit draft split into two appended lines (credit portion + cash received now)", () => {
    const result = resolveConfirm({
      drafts: [
        { paymentType: PAYMENT_TYPES.CREDIT, amount: 70, customerCode: "C1", customerName: "Jane" },
        { paymentType: PAYMENT_TYPES.CASH, amount: 30 },
      ],
      editingLine: null,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 0,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.appends).toHaveLength(2);
    expect(result.appends[0].paymentType).toBe(PAYMENT_TYPES.CREDIT);
    expect(result.appends[1].paymentType).toBe(PAYMENT_TYPES.CASH);
  });
});

describe("resolveConfirm — editing", () => {
  it("replaces the edited line in place, preserving its id", () => {
    const editingLine = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 50 });
    const result = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CASH, amount: 65 },
      editingLine,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 50,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.updates).toEqual([{ id: editingLine.id, patch: expect.objectContaining({ amount: 65 }) }]);
    expect(result.removals).toEqual([]);
  });

  it("removes the line when the modal returns no draft of the edited type, rather than leaving a stale zero-value tender", () => {
    const editingLine = createPaymentLine({ paymentType: PAYMENT_TYPES.CREDIT, amount: 40, customerCode: "C1" });
    const result = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CASH, amount: 40 },
      editingLine,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 40,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.removals).toEqual([editingLine.id]);
    expect(result.appends).toHaveLength(1);
    expect(result.appends[0].paymentType).toBe(PAYMENT_TYPES.CASH);
  });

  it("never chains onward while editing, even if the edit fully settles the bill", () => {
    const editingLine = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 50 });
    const result = resolveConfirm({
      drafts: { paymentType: PAYMENT_TYPES.CASH, amount: 100 },
      editingLine,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 50,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.nextMethod).toBeNull();
  });

  it("appends any extra drafts beyond the one matching the edited line's type", () => {
    const editingLine = createPaymentLine({ paymentType: PAYMENT_TYPES.CREDIT, amount: 100, customerCode: "C1" });
    const result = resolveConfirm({
      drafts: [
        { paymentType: PAYMENT_TYPES.CREDIT, amount: 70, customerCode: "C1", customerName: "Jane" },
        { paymentType: PAYMENT_TYPES.CASH, amount: 30 },
      ],
      editingLine,
      invoiceTotal: 100,
      allocatedBeforeConfirm: 100,
      offeredTypes: [PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT],
    });
    expect(result.updates).toEqual([{ id: editingLine.id, patch: expect.objectContaining({ amount: 70 }) }]);
    expect(result.appends).toHaveLength(1);
    expect(result.appends[0].paymentType).toBe(PAYMENT_TYPES.CASH);
  });
});
