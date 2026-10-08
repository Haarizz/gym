import { describe, expect, it } from "vitest";
import { denominationTotal, priceCart, promoDiscountOf, r2, type CartLine, type PromoRule } from "../pricing";

// The same scenarios as the backend's PosCheckoutServiceTest, so the terminal's
// on-screen totals are proven to match what the server charges.

const line = (productId: number, price: number, qty: number, taxRate = 5, discountValue = 0, discountType: "PERCENT" | "AMOUNT" = "PERCENT"): CartLine => ({
  key: `k${productId}`, productId, name: `P${productId}`, sku: null, barcode: null, categoryName: null, imageUrl: null,
  listPrice: price, unitPrice: price, priceOverridden: false, quantity: qty, discountType, discountValue, taxRate, costPrice: 0, stock: null,
});

describe("priceCart", () => {
  it("exclusive VAT with line and bill discount reconciles like the server", () => {
    const t = priceCart([line(1, 100, 2, 5, 10), line(2, 25, 1)], { type: "AMOUNT", value: 5 }, false);
    expect(t.subtotal).toBe(225);
    expect(t.lineDiscount).toBe(20);
    expect(t.billDiscount).toBe(5);
    expect(t.taxable).toBe(200);
    expect(t.tax).toBe(10);
    expect(t.total).toBe(210);
    expect(r2(t.lines.reduce((a, l) => a + l.billShare, 0))).toBe(5);
    expect(t.lines[0].billShare).toBe(4.39);
    expect(t.lines[1].billShare).toBe(0.61);
  });

  it("extracts VAT from inclusive prices", () => {
    const t = priceCart([line(1, 100, 1)], null, true);
    expect(t.total).toBe(100);
    expect(t.taxable).toBe(95.24);
    expect(t.tax).toBe(4.76);
  });

  it("matches the server for a 25% discount", () => {
    const t = priceCart([line(1, 100, 1, 5, 25)], null, false);
    expect(t.total).toBe(78.75);
    expect(t.maxDiscountPercent).toBe(25);
  });

  it("applies amount discounts and caps them at the line", () => {
    const t = priceCart([line(1, 40, 1, 5, 60, "AMOUNT")], null, false);
    expect(t.lines[0].discountAmount).toBe(40);
    expect(t.total).toBe(0);
  });

  it("percent bill discount", () => {
    const t = priceCart([line(7, 60, 1)], { type: "PERCENT", value: 10 }, false);
    expect(t.billDiscount).toBe(6);
    expect(t.total).toBe(56.7);
  });

  it("flags price overrides", () => {
    const l = { ...line(1, 100, 1), unitPrice: 80, priceOverridden: true };
    const t = priceCart([l], null, false);
    expect(t.hasPriceOverride).toBe(true);
    expect(t.total).toBe(84);
  });

  it("rounds half up like BigDecimal", () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(2.675)).toBe(2.68);
    expect(r2(-1.005)).toBe(-1.01);
  });
});

const promo = (over: Partial<PromoRule>): PromoRule => ({
  source: "PROMOTION", code: "SAVE", promotionId: 1, name: "Save", discountType: "percentage", discountValue: 10,
  maximumDiscount: null, minimumPurchase: null, ...over,
});

describe("promotions / coupons", () => {
  it("applies a percentage after the bill discount and spreads both over the lines", () => {
    // 200 + 100 = 300; bill 30 → 270; 10% promo = 27; spread 57 pro-rata 2:1
    const t = priceCart([line(1, 100, 2, 0), line(2, 100, 1, 0)], { type: "AMOUNT", value: 30 }, false, promo({}));
    expect(t.billDiscount).toBe(30);
    expect(t.promoDiscount).toBe(27);
    expect(t.totalDiscount).toBe(57);
    expect(t.total).toBe(243);
    expect(t.lines[0].billShare).toBe(38);
    expect(t.lines[1].billShare).toBe(19);
  });

  it("caps a percentage at the maximum discount", () => {
    const t = priceCart([line(1, 500, 1, 5)], null, false, promo({ discountValue: 20, maximumDiscount: 50 }));
    expect(t.promoDiscount).toBe(50);
    expect(t.taxable).toBe(450);
    expect(t.total).toBe(472.5);
  });

  it("gives nothing below the minimum purchase and says why", () => {
    const t = priceCart([line(1, 40, 1)], null, false, promo({ minimumPurchase: 100 }));
    expect(t.promoDiscount).toBe(0);
    expect(t.promoError).toContain("100.00");
    expect(t.total).toBe(42);
  });

  it("fixed and free types never exceed the basket", () => {
    expect(promoDiscountOf(promo({ discountType: "fixed", discountValue: 80 }), 60).amount).toBe(60);
    expect(promoDiscountOf(promo({ discountType: "free", discountValue: 0 }), 75.5).amount).toBe(75.5);
    expect(promoDiscountOf(promo({ discountType: "percentage", discountValue: 12.5 }), 99.99).amount).toBe(12.5);
  });

  it("does not count the promotion towards the cashier discount limit", () => {
    const t = priceCart([line(1, 100, 1)], null, false, promo({ discountValue: 50 }));
    expect(t.promoDiscount).toBe(50);
    expect(t.maxDiscountPercent).toBe(0);
  });
});

describe("denominationTotal", () => {
  it("sums notes and coins", () => {
    expect(denominationTotal({ "100": 5, "50": 1, "0.25": 3, "0.50": 1 })).toBe(551.25);
  });
});
