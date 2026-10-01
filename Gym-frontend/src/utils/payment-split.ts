import type { Receipt } from "./supabase/receipts-service";

/** Display order for payment method buckets */
export const PAY_METHOD_ORDER = ["Cash", "Card", "Online", "Bank Transfer", "Cheque", "Other"] as const;
export type PayMethodBucket = (typeof PAY_METHOD_ORDER)[number];

/** Groups the many method labels receipts carry (Visa, UPI, Bank transfer...) into a few buckets */
export function methodBucket(method?: string | null): PayMethodBucket {
  const m = (method || "").toLowerCase();
  if (!m) return "Other";
  if (m.includes("cash")) return "Cash";
  if (m.includes("card") || m.includes("visa") || m.includes("master") || m.includes("amex")) return "Card";
  if (m.includes("bank") || m.includes("transfer")) return "Bank Transfer";
  if (m.includes("cheque") || m.includes("check")) return "Cheque";
  if (m.includes("online") || m.includes("upi") || m.includes("pay") || m.includes("wallet") || m.includes("link")) return "Online";
  return "Other";
}

/** Money received on a receipt (its own paid_amount, falling back to the bill amount) */
export const receiptPaid = (r: Receipt) => Number(r.paid_amount ?? r.amount ?? 0);

/** Splits what was received on a receipt across payment methods, using the per-leg breakdown when present */
export function splitPaid(r: Receipt, paid: number = receiptPaid(r)): Record<string, number> {
  const out: Record<string, number> = {};
  if (!(paid > 0)) return out;
  const legs = (r.payment_breakdown || []).filter((l) => Number(l.amount) > 0);
  const legsTotal = legs.reduce((sum, l) => sum + Number(l.amount), 0);
  if (legs.length > 0 && legsTotal > 0) {
    for (const l of legs) {
      const key = methodBucket(l.method);
      out[key] = (out[key] || 0) + (Number(l.amount) * paid) / legsTotal;
    }
  } else {
    out[methodBucket(r.payment_method)] = paid;
  }
  return out;
}

/** Totals per method across receipts, in display order, skipping empty methods */
export function totalsByMethod(receipts: Receipt[]): { method: PayMethodBucket; amount: number }[] {
  const sums: Record<string, number> = {};
  for (const r of receipts) {
    for (const [m, amt] of Object.entries(splitPaid(r))) sums[m] = (sums[m] || 0) + amt;
  }
  return PAY_METHOD_ORDER.filter((m) => (sums[m] || 0) > 0).map((m) => ({ method: m, amount: sums[m] }));
}
