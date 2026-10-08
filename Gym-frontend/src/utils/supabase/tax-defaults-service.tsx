import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * The active branch's tax policy (Settings › Tax Configuration). The server applies the same rules
 * when it saves a sale or purchase — this only lets every screen show the right figures up front.
 */
export interface TaxDefaults {
  /** TRN / VAT registration switch. Off: no tax is charged on any sale or purchase. */
  vatRegistered: boolean;
  trn: string | null;
  vatRate: number | null;
  salesRate: number | null;
  purchaseRate: number | null;
}

/** Product fields that drive line tax and discounts. */
export interface TaxedProduct {
  taxRate?: number | null;
  useDefaultTax?: boolean;
  allowDiscount?: boolean;
  maxDiscountPercent?: number;
  purchaseDiscountPercent?: number;
}

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

const CACHE_MS = 30_000;
let cache: { at: number; branch: string | null; value: Promise<TaxDefaults> } | null = null;

const activeBranch = () => {
  try { return sessionStorage.getItem("activeBranchId"); } catch { return null; }
};

export async function getTaxDefaults(force = false): Promise<TaxDefaults> {
  const branch = activeBranch();
  if (!force && cache && cache.branch === branch && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = (async () => {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-defaults`);
    if (!res.ok) throw new Error("Failed to load tax settings");
    const r = await res.json();
    return {
      vatRegistered: (r.vat_registered ?? r.vatRegistered) !== false,
      trn: r.trn ?? null,
      vatRate: num(r.vat_rate ?? r.vatRate),
      salesRate: num(r.sales_rate ?? r.salesRate),
      purchaseRate: num(r.purchase_rate ?? r.purchaseRate),
    };
  })();
  cache = { at: Date.now(), branch, value };
  value.catch(() => { cache = null; });
  return value;
}

/** Forget the cached policy (after Settings › Tax Configuration is saved). */
export function clearTaxDefaults() {
  cache = null;
}

/** Tax % a sales line carries — the same rule the server applies. */
export function salesTaxFor(p: TaxedProduct | null | undefined, d: TaxDefaults | null): number {
  if (d && !d.vatRegistered) return 0;
  if (p && p.useDefaultTax === false) return Number(p.taxRate) || 0;
  if (d?.salesRate != null) return d.salesRate;
  return Number(p?.taxRate) || 0;
}

/** Default tax % for a purchase line. */
export function purchaseTaxFor(p: TaxedProduct | null | undefined, d: TaxDefaults | null): number {
  if (d && !d.vatRegistered) return 0;
  if (p && p.useDefaultTax === false) return Number(p.taxRate) || 0;
  if (d?.purchaseRate != null) return d.purchaseRate;
  return Number(p?.taxRate) || 0;
}

/** Sales discount % pre-filled on a POS / Sales Invoice line. */
export function salesDiscountFor(p: TaxedProduct | null | undefined): number {
  if (!p || p.allowDiscount === false) return 0;
  return Math.max(0, Math.min(100, Number(p.maxDiscountPercent) || 0));
}

/** Discount % pre-filled on a Purchase Order / Supplier Bill line. */
export function purchaseDiscountFor(p: TaxedProduct | null | undefined): number {
  return Math.max(0, Math.min(100, Number(p?.purchaseDiscountPercent) || 0));
}
