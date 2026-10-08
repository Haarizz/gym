// Cart pricing for the terminal. Mirrors PosCheckoutService exactly (2-dp HALF_UP
// rounding at the same steps) so what the cashier sees is what the server charges:
//   gross → line discount → bill discount spread pro-rata over line nets (last line
//   takes the remainder) → VAT per line, added on top or extracted (tax-inclusive).

export interface CartLine {
  key: string;
  productId: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  listPrice: number;
  unitPrice: number;
  priceOverridden: boolean;
  quantity: number;
  /** Line discount: percent or fixed amount. */
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  taxRate: number;
  costPrice: number;
  stock: number | null;
  /** Product setting: false = no discount allowed on this line. */
  allowDiscount?: boolean;
  /** Product's maximum discount % (pre-filled; above it needs a supervisor). 0 = the cashier limit applies. */
  maxDiscount?: number;
  note?: string;
  /** Voided lines stay visible in the cart (BillBull VOID mode) but are never priced or sold. */
  voided?: boolean;
}

/** The discount % a cashier may give on a line without a supervisor: the product's own max, else the cashier limit. */
export function discountLimit(line: Pick<CartLine, "maxDiscount">, cashierMax: number): number {
  return line.maxDiscount && line.maxDiscount > 0 ? line.maxDiscount : cashierMax;
}

export interface BillDiscount {
  type: "PERCENT" | "AMOUNT";
  value: number;
}

/**
 * A promotion or coupon applied at the till (Gymbios promotion engine). The server recomputes
 * the discount with the same formula; this is the till's preview.
 */
export interface PromoRule {
  source: "PROMOTION" | "COUPON";
  code: string | null;
  promotionId: number | null;
  name: string;
  discountType: "percentage" | "fixed" | "free" | string;
  discountValue: number;
  maximumDiscount: number | null;
  minimumPurchase: number | null;
}

/** DiscountCodeService formula: % (capped at maximumDiscount), free = whole basket, else a flat amount; never above base. */
export function promoDiscountOf(rule: PromoRule, base: number): { amount: number; error: string | null } {
  const b = Math.max(0, base);
  if (rule.minimumPurchase != null && b < rule.minimumPurchase) {
    return { amount: 0, error: `Needs a minimum purchase of ${rule.minimumPurchase.toFixed(2)}` };
  }
  const type = (rule.discountType || "percentage").toLowerCase();
  let d = type === "percentage" ? r2((b * (rule.discountValue || 0)) / 100) : type === "free" ? b : rule.discountValue || 0;
  if (rule.maximumDiscount != null && rule.maximumDiscount > 0) d = Math.min(d, rule.maximumDiscount);
  return { amount: r2(Math.min(Math.max(0, d), b)), error: null };
}

export interface PricedLine extends CartLine {
  gross: number;
  discountAmount: number;
  discountPercent: number;
  net: number;
  billShare: number;
  taxable: number;
  tax: number;
  total: number;
}

export interface CartTotals {
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  lineDiscount: number;
  billDiscount: number;
  /** Discount from the applied promotion / coupon (after the bill discount). */
  promoDiscount: number;
  /** Why the applied promotion gives nothing right now (e.g. minimum purchase not met). */
  promoError: string | null;
  totalDiscount: number;
  taxable: number;
  tax: number;
  total: number;
  /** Highest line or bill discount % in the cart (for the cashier discount limit). */
  maxDiscountPercent: number;
  hasPriceOverride: boolean;
}

/** BigDecimal.setScale(2, HALF_UP) for the magnitudes a till handles. */
export function r2(v: number): number {
  const sign = v < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(v) + Number.EPSILON) * 100)) / 100;
}

const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));

export function priceCart(cart: CartLine[], bill: BillDiscount | null, taxInclusive: boolean, promo: PromoRule | null = null): CartTotals {
  let maxPct = 0;
  const lines: PricedLine[] = cart.map((l) => {
    const gross = r2(l.unitPrice * l.quantity);
    let discountAmount: number;
    let discountPercent: number;
    if (l.discountType === "AMOUNT" && l.discountValue > 0) {
      discountAmount = r2(Math.min(l.discountValue, gross));
      discountPercent = gross === 0 ? 0 : r2((discountAmount * 100) / gross);
    } else {
      discountPercent = Math.max(0, Math.min(100, l.discountValue || 0));
      discountAmount = r2((gross * discountPercent) / 100);
    }
    maxPct = Math.max(maxPct, discountPercent);
    return { ...l, gross, discountAmount, discountPercent: r2(discountPercent), net: r2(gross - discountAmount), billShare: 0, taxable: 0, tax: 0, total: 0 };
  });

  const billBase = sum(lines.map((l) => l.net));
  let billDiscount = 0;
  if (bill && bill.value > 0 && billBase > 0) {
    billDiscount = bill.type === "PERCENT"
      ? r2((billBase * Math.min(bill.value, 100)) / 100)
      : r2(Math.min(bill.value, billBase));
    maxPct = Math.max(maxPct, r2((billDiscount * 100) / billBase));
  }
  // The promotion applies to what is left after the bill discount; both are spread together.
  const promoResult = promo && billBase > 0 ? promoDiscountOf(promo, r2(billBase - billDiscount)) : { amount: 0, error: null };
  const promoDiscount = promoResult.amount;
  const spread = r2(billDiscount + promoDiscount);
  let lastWithNet = -1;
  lines.forEach((l, i) => { if (l.net > 0) lastWithNet = i; });
  let allocated = 0;
  lines.forEach((l, i) => {
    if (spread === 0 || l.net === 0) l.billShare = 0;
    else if (i === lastWithNet) l.billShare = Math.min(r2(spread - allocated), l.net);
    else {
      l.billShare = Math.min(r2((spread * l.net) / billBase), l.net);
      allocated = r2(allocated + l.billShare);
    }
  });

  for (const l of lines) {
    const after = r2(l.net - l.billShare);
    if (taxInclusive) {
      const divisor = Math.round((1 + l.taxRate / 100) * 1e6) / 1e6;
      l.taxable = r2(after / divisor);
      l.tax = r2(after - l.taxable);
    } else {
      l.taxable = after;
      l.tax = r2((after * l.taxRate) / 100);
    }
    l.total = r2(l.taxable + l.tax);
  }

  const lineDiscount = sum(lines.map((l) => l.discountAmount));
  const taxable = sum(lines.map((l) => l.taxable));
  const tax = sum(lines.map((l) => l.tax));
  return {
    lines,
    itemCount: lines.reduce((a, l) => a + l.quantity, 0),
    subtotal: sum(lines.map((l) => l.gross)),
    lineDiscount,
    billDiscount,
    promoDiscount,
    promoError: promoResult.error,
    totalDiscount: r2(lineDiscount + billDiscount + promoDiscount),
    taxable,
    tax,
    total: r2(taxable + tax),
    maxDiscountPercent: maxPct,
    hasPriceOverride: lines.some((l) => l.priceOverridden && l.unitPrice !== l.listPrice),
  };
}

export const money = (n: number | null | undefined, code = "AED") =>
  `${code} ${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Cash count ────────────────────────────────────────────────────────────

export type Denominations = Record<string, number>;

export const denomKey = (d: number) => (Number.isInteger(d) ? String(d) : d.toFixed(2));

export function denominationTotal(counts: Denominations): number {
  return r2(Object.entries(counts).reduce((t, [k, c]) => t + parseFloat(k) * (Number(c) || 0), 0));
}

export function emptyDenominations(values: number[]): Denominations {
  const out: Denominations = {};
  values.forEach((v) => { out[denomKey(v)] = 0; });
  return out;
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
