import { describe, expect, it } from "vitest";
import { PAYMENT_TYPES, createPaymentLine, lineLabel, toAmount, validateLine } from "../paymentModel";

describe("toAmount", () => {
  it("parses numeric strings", () => {
    expect(toAmount("42.5")).toBe(42.5);
  });

  it("returns 0 for null, undefined, and empty string", () => {
    expect(toAmount(null)).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount("")).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(toAmount(-10)).toBe(0);
    expect(toAmount("-10")).toBe(0);
  });

  it("returns 0 for non-numeric input", () => {
    expect(toAmount("abc")).toBe(0);
  });
});

describe("createPaymentLine", () => {
  it("assigns a unique id to every line, independent of array position", () => {
    const a = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 10 });
    const b = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 10 });
    expect(a.id).not.toBe(b.id);
  });

  it("keeps business-critical fields first-class and metadata separate", () => {
    const line = createPaymentLine({
      paymentType: PAYMENT_TYPES.CARD,
      paymentSubtype: "Visa",
      amount: "30",
      reference: "TXN-1",
      metadata: { hint: "for UI only" },
    });
    expect(line.paymentSubtype).toBe("Visa");
    expect(line.amount).toBe(30);
    expect(line.reference).toBe("TXN-1");
    expect(line.metadata).toEqual({ hint: "for UI only" });
  });
});

describe("lineLabel", () => {
  it("reports the card network for CARD lines", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, paymentSubtype: "Visa", amount: 10 });
    expect(lineLabel(line)).toBe("Visa");
  });

  it("falls back to the type label when a CARD line has no subtype", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, amount: 10 });
    expect(lineLabel(line)).toBe("Card");
  });

  it("reports the type label for non-CARD lines", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 10 });
    expect(lineLabel(line)).toBe("Cash");
  });
});

describe("validateLine", () => {
  it("rejects a zero or negative amount", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 0 });
    expect(validateLine(line)).toMatch(/greater than 0/);
  });

  it("requires a card type for CARD lines", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CARD, amount: 10 });
    expect(validateLine(line)).toMatch(/card type/i);
  });

  it("requires a bank account for ONLINE lines", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.ONLINE, amount: 10 });
    expect(validateLine(line)).toMatch(/bank account/i);
  });

  it("requires a customer for CREDIT lines", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CREDIT, amount: 10 });
    expect(validateLine(line)).toMatch(/customer/i);
  });

  it("passes a fully-specified line", () => {
    const line = createPaymentLine({ paymentType: PAYMENT_TYPES.CASH, amount: 10 });
    expect(validateLine(line)).toBeNull();
  });
});
