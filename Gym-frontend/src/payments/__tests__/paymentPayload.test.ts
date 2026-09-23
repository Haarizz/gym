import { describe, expect, it } from "vitest";
import { PAYMENT_TYPES, createPaymentLine } from "../paymentModel";
import { buildPaymentPayload, round2 } from "../paymentPayload";

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(19.005)).toBe(19.01);
    expect(round2(19.994)).toBe(19.99);
  });
});

describe("buildPaymentPayload", () => {
  it("builds the acceptance-example payload: Online 20, Cash 50, Card/Visa 30 against a 100 bill", () => {
    const lines = [
      createPaymentLine({
        paymentType: PAYMENT_TYPES.ONLINE,
        amount: 20,
        bankAccountName: "1010 - Bank Account (Main)",
      }),
      createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 50 }),
      createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, paymentSubtype: "Visa", amount: 30, reference: "TXN-001" }),
    ];

    const payload = buildPaymentPayload(lines, 100);

    expect(payload.paymentAllocations).toEqual([
      { type: "ONLINE", subtype: null, amount: 20, reference: null, bankAccountName: "1010 - Bank Account (Main)" },
      { type: "CASH", subtype: null, amount: 50, reference: null },
      { type: "CARD", subtype: "Visa", amount: 30, reference: "TXN-001" },
    ]);
    expect(payload.paymentSummary).toBe("Online + Cash + Visa");
    expect(payload.paymentMode).toBe("Online + Cash + Visa");
    expect(payload.paymentMode).not.toMatch(/mixed/i);
    expect(payload.changeDue).toBe(0);
    expect(payload.paidAmount).toBe(100);
    expect(payload.cashTaken).toBe(true);
    expect(payload.creditBalance).toBe(0);
    expect(payload.creditAccount).toBeNull();
  });

  it("reports change due when cash overpays", () => {
    const lines = [createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 120 })];
    const payload = buildPaymentPayload(lines, 100);
    expect(payload.changeDue).toBe(20);
    expect(payload.paidAmount).toBe(100);
  });

  it("separates the credit balance from paidAmount and carries the account holder", () => {
    const lines = [
      createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 40 }),
      createPaymentLine({ paymentType: PAYMENT_TYPES.CREDIT, amount: 60, customerCode: "C1", customerName: "Jane Doe" }),
    ];
    const payload = buildPaymentPayload(lines, 100);
    expect(payload.paidAmount).toBe(40);
    expect(payload.creditBalance).toBe(60);
    expect(payload.creditAccount).toEqual({ code: "C1", name: "Jane Doe" });
    expect(payload.cashTaken).toBe(true);
  });

  it("cashTaken is false when no cash line is present", () => {
    const lines = [createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, paymentSubtype: "Visa", amount: 100 })];
    const payload = buildPaymentPayload(lines, 100);
    expect(payload.cashTaken).toBe(false);
  });
});
