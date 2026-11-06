/**
 * Shared data rules for the Sales & Purchases Reports and Analytics pages — the same rules as the
 * module overview (pages/sales-purchases.tsx):
 *  - sales = CONFIRMED sales invoices (back-office invoices plus the invoice every POS sale creates),
 *    net of returns;
 *  - gross profit = sales before tax × kept − cost of goods × kept, where kept = 1 − returned/total,
 *    because a return doesn't reduce the invoice's own tax/cost figures;
 *  - purchases = CONFIRMED supplier bills (what was actually bought), not purchase orders.
 * Invoices and bills are branch-scoped by the backend.
 */
import { salesInvoiceService, type SalesInvoice } from "../../utils/supabase/sales-invoice-service";
import { supplierBillService, type SupplierBill } from "../../utils/supabase/supplier-bill-service";
import { productsService, type Product } from "../../utils/supabase/products-service";

export const inRange = (iso: string | undefined, from: string, to: string) =>
  !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;

/** Share of the invoice that wasn't returned. */
export const keptShare = (inv: SalesInvoice) => {
  const total = Number(inv.totalAmount) || 0;
  return total > 0 ? Math.max(0, 1 - (Number(inv.returnedAmount) || 0) / total) : 1;
};
/** What the customer paid for, net of returns (incl. tax). */
export const netSale = (inv: SalesInvoice) => (Number(inv.totalAmount) || 0) - (Number(inv.returnedAmount) || 0);
export const exTax = (inv: SalesInvoice) => (Number(inv.taxableAmount) || 0) * keptShare(inv);
export const taxKept = (inv: SalesInvoice) => (Number(inv.taxAmount) || 0) * keptShare(inv);
export const cogsKept = (inv: SalesInvoice) => (Number(inv.totalCogs) || 0) * keptShare(inv);
export const balanceDue = (inv: SalesInvoice) => Math.max(0, netSale(inv) - (Number(inv.amountPaid) || 0));
export const itemCount = (inv: SalesInvoice) => (inv.items ?? []).reduce((q, it) => q + (Number(it.quantity) || 0), 0);

export interface SalesTotals {
  sales: number; revenue: number; tax: number; cost: number; profit: number;
  returned: number; gross: number; count: number; avg: number; items: number; due: number;
}

export function totalsOf(invs: SalesInvoice[]): SalesTotals {
  let sales = 0, revenue = 0, tax = 0, cost = 0, returned = 0, gross = 0, items = 0, due = 0;
  for (const i of invs) {
    sales += netSale(i); revenue += exTax(i); tax += taxKept(i); cost += cogsKept(i);
    returned += Number(i.returnedAmount) || 0; gross += Number(i.totalAmount) || 0;
    items += itemCount(i); due += balanceDue(i);
  }
  return { sales, revenue, tax, cost, profit: revenue - cost, returned, gross, count: invs.length, avg: invs.length ? sales / invs.length : 0, items, due };
}

/** Payment legs recorded on the invoice; a single-method invoice counts its amount paid. */
export function paymentLegs(inv: SalesInvoice): { method: string; amount: number }[] {
  const legs = (inv.paymentBreakdown ?? [])
    .map(l => ({ method: String(l.method ?? l.payment_method ?? l.type ?? "Other"), amount: Number(l.amount) || 0 }))
    .filter(l => l.amount > 0);
  if (legs.length) return legs;
  const paid = Number(inv.amountPaid) || 0;
  return paid > 0 ? [{ method: prettyMethod(inv.paymentMethod) || "Other", amount: paid }] : [];
}

export const prettyMethod = (m?: string) => {
  if (!m) return "";
  const s = m.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export async function loadConfirmedInvoices(): Promise<SalesInvoice[]> {
  return salesInvoiceService.getAllInvoices({ status: "CONFIRMED" });
}

export async function loadConfirmedBills(): Promise<SupplierBill[]> {
  const out: SupplierBill[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await supplierBillService.getBills({ page, size: 500 });
    out.push(...r.bills);
    if (r.bills.length < 500 || page >= (r.pagination.totalPages || 1)) break;
  }
  return out.filter(b => b.status === "CONFIRMED");
}

export async function loadAllProducts(): Promise<Product[]> {
  const out: Product[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await productsService.getProducts({ page, size: 500 });
    out.push(...r.products);
    if (r.products.length < 500 || page >= (r.pagination.totalPages || 1)) break;
  }
  return out;
}

/** Days between two ISO dates, inclusive. */
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000) + 1;
