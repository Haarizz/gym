import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart3, CalendarDays, CreditCard, Download, FileSpreadsheet, Layers, Package, Receipt, RefreshCw,
  RotateCcw, Search, ShoppingBag, ShoppingCart, Truck, TrendingUp, Users, Wallet,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import type { SalesInvoice } from "../utils/supabase/sales-invoice-service";
import type { SupplierBill } from "../utils/supabase/supplier-bill-service";
import type { Product } from "../utils/supabase/products-service";
import { ReportActions, type ReportDocument, type ReportRow, type ValueFormat, kpiSection } from "../components/report-export";
import { styles, Kpi, Panel, Empty, Seg, SectionTabs, Status, fmtInt, fmtDate, isoDate, IconT } from "../components/overview/overview-kit";
import {
  inRange, keptShare, netSale, exTax, taxKept, cogsKept, balanceDue, itemCount, totalsOf, paymentLegs, prettyMethod,
  loadConfirmedInvoices, loadConfirmedBills, loadAllProducts,
} from "../components/sales/sales-data";

type Preset = "today" | "yesterday" | "7d" | "mtd" | "last" | "90d" | "ytd" | "custom";
type Source = "all" | "pos" | "manual";
type ReportId = "register" | "daily" | "products" | "categories" | "customers" | "payments" | "returns" | "purchases" | "suppliers" | "bought";
type Kind = "text" | "money" | "int" | "qty" | "pct" | "date" | "status";
type StatusVal = "paid" | "part paid" | "unpaid" | "overdue" | "returned" | "due";
interface Col { label: string; kind?: Kind }
interface Row { key: string; cells: (string | number | null)[]; sub?: (string | null)[] }
interface Report { title: string; sub: string; icon: IconT; cols: Col[]; rows: Row[]; foot?: (string | number | null)[]; empty: string; file: string }

const PRESETS: [Preset, string][] = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["7d", "Last 7 days"], ["mtd", "This month"],
  ["last", "Last month"], ["90d", "Last 90 days"], ["ytd", "This year"], ["custom", "Custom"],
];
const STATUS_KIND: Record<StatusVal, "good" | "warning" | "critical" | "info"> = {
  paid: "good", "part paid": "warning", unpaid: "warning", overdue: "critical", returned: "info", due: "info",
};
const PAGE = 100;

function presetRange(p: Preset, custom: { from: string; to: string }) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const day = (offset: number) => isoDate(new Date(y, m, d + offset));
  switch (p) {
    case "today": return { from: day(0), to: day(0) };
    case "yesterday": return { from: day(-1), to: day(-1) };
    case "7d": return { from: day(-6), to: day(0) };
    case "mtd": return { from: isoDate(new Date(y, m, 1)), to: day(0) };
    case "last": return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "90d": return { from: day(-89), to: day(0) };
    case "ytd": return { from: isoDate(new Date(y, 0, 1)), to: day(0) };
    default: return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
  }
}

const saleStatus = (inv: SalesInvoice): StatusVal => {
  if (Number(inv.returnedAmount) > 0 && netSale(inv) <= 0.005) return "returned";
  const due = balanceDue(inv);
  if (due <= 0.005) return "paid";
  return (Number(inv.amountPaid) || 0) > 0 ? "part paid" : "unpaid";
};

/**
 * Sales & Purchase Reports: ten printable/exportable reports for any date range, built on the
 * same data rules as the module overview and Sales Analytics (components/sales/sales-data.ts).
 * Every report has totals and exports to CSV / Excel with plain currency codes.
 */
export function SalesReports() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const { formatCurrency, currencyCode } = useCurrency();
  const money = useCallback((n: number) => formatCurrency(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [formatCurrency]);
  const money0 = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>("mtd");
  const [custom, setCustom] = useState(() => { const r = presetRange("mtd", { from: "", to: "" }); return r; });
  const [source, setSource] = useState<Source>("all");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<ReportId>("register");
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(async () => {
    setLoading(true);
    const [i, b, p] = await Promise.allSettled([loadConfirmedInvoices(), loadConfirmedBills(), loadAllProducts()]);
    const errors: string[] = [];
    if (i.status === "fulfilled") setInvoices(i.value); else errors.push("sales invoices");
    if (b.status === "fulfilled") setBills(b.value); else errors.push("supplier bills");
    if (p.status === "fulfilled") setProducts(p.value); else errors.push("products");
    setFailed(errors);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);
  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  useEffect(() => { setShown(PAGE); }, [range, source, search, report]);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const q = search.trim().toLowerCase();

  const sales = useMemo(() => invoices.filter(i =>
    inRange(i.invoiceDate, range.from, range.to)
    && (source === "all" || (source === "pos" ? i.source === "POS" : i.source !== "POS"))), [invoices, range, source]);
  const salesSearched = useMemo(() => !q ? sales : sales.filter(i =>
    [i.invoiceNumber, i.customerName, i.customerPhone, i.reference, ...(i.items ?? []).map(it => it.productName)]
      .some(v => (v || "").toLowerCase().includes(q))), [sales, q]);
  const purchases = useMemo(() => bills.filter(b => inRange(b.billDate, range.from, range.to)), [bills, range]);
  const purchasesSearched = useMemo(() => !q ? purchases : purchases.filter(b =>
    [b.billNumber, b.invoiceNumber, b.supplierName, ...(b.items ?? []).map(it => it.productName)].some(v => (v || "").toLowerCase().includes(q))), [purchases, q]);

  const t = useMemo(() => totalsOf(sales), [sales]);
  const bought = purchases.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
  const owedSuppliers = purchases.reduce((s, b) => s + Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.amountPaid) || 0)), 0);
  const today = isoDate(new Date());
  const isPurchaseReport = report === "purchases" || report === "suppliers" || report === "bought";

  // ── Reports ──
  const reports = useMemo((): Record<ReportId, Report> => {
    const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
    const sumCol = (rows: Row[], idx: number) => rows.reduce((s, r) => s + (Number(r.cells[idx]) || 0), 0);
    const rangeTxt = `${range.from}_to_${range.to}`;

    // Sales register
    const regRows: Row[] = [...salesSearched]
      .sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map(inv => {
        const first = inv.items?.[0]?.productName;
        const methods = [...new Set(paymentLegs(inv).map(l => l.method))].join(" + ");
        return {
          key: String(inv.id),
          cells: [inv.invoiceNumber, inv.invoiceDate, inv.customerName || "Walk-in", fmtInt(itemCount(inv)), methods || "—", saleStatus(inv),
            exTax(inv), taxKept(inv), Number(inv.returnedAmount) || 0, netSale(inv), Math.min(netSale(inv), Number(inv.amountPaid) || 0), balanceDue(inv)],
          sub: [inv.source === "POS" ? "Point of Sale" : "Invoice", null, inv.customerPhone || null,
            first ? (inv.items.length > 1 ? `${first} +${inv.items.length - 1}` : first) : null, null, null, null, null, null, null, null, null],
        };
      });

    // Daily summary
    const byDay = new Map<string, SalesInvoice[]>();
    for (const inv of sales) { const k = (inv.invoiceDate || "").slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), inv]); }
    const dayRows: Row[] = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, invs]) => {
      const d = totalsOf(invs);
      return { key: day, cells: [day, d.count, d.items, d.revenue, d.tax, d.returned, d.sales, d.cost, d.profit, d.revenue > 0 ? pct(d.profit, d.revenue) : null] };
    });

    // Products
    const prodMap = new Map<string, { id?: number; name: string; sku: string; qty: number; amount: number; count: number }>();
    for (const inv of sales) {
      const kept = keptShare(inv);
      const seen = new Set<string>();
      for (const it of inv.items ?? []) {
        const key = it.productId ? `p${it.productId}` : `n${it.productName}`;
        const v = prodMap.get(key) ?? { id: it.productId || undefined, name: it.productName || "Item", sku: it.productSku || "", qty: 0, amount: 0, count: 0 };
        v.qty += (Number(it.quantity) || 0) * kept; v.amount += (Number(it.totalAmount) || 0) * kept;
        if (!seen.has(key)) { v.count++; seen.add(key); }
        prodMap.set(key, v);
      }
    }
    const itemsTotal = [...prodMap.values()].reduce((s, v) => s + v.amount, 0);
    const prodAll = [...prodMap.entries()].sort((a, b) => b[1].amount - a[1].amount);
    const prodRows: Row[] = prodAll
      .filter(([, v]) => !q || v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
      .map(([key, v]) => {
        const prod = v.id ? productById.get(v.id) : undefined;
        return { key, cells: [v.name, v.sku || prod?.sku || "", prod?.categoryName || "Uncategorised", v.qty, v.count, v.qty > 0 ? v.amount / v.qty : 0, v.amount, pct(v.amount, itemsTotal)] };
      });

    // Categories
    const catMap = new Map<string, { products: Set<string>; qty: number; amount: number }>();
    for (const [key, v] of prodAll) {
      const cat = (v.id && productById.get(v.id)?.categoryName) || "Uncategorised";
      const c = catMap.get(cat) ?? { products: new Set<string>(), qty: 0, amount: 0 };
      c.products.add(key); c.qty += v.qty; c.amount += v.amount;
      catMap.set(cat, c);
    }
    const catRows: Row[] = [...catMap.entries()].sort((a, b) => b[1].amount - a[1].amount)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .map(([name, c]) => ({ key: name, cells: [name, c.products.size, c.qty, c.amount, pct(c.amount, itemsTotal)] }));

    // Customers
    const custMap = new Map<string, { name: string; phone: string; type: string; count: number; items: number; amount: number; due: number; last: string }>();
    for (const inv of sales) {
      const walkIn = !inv.memberId && (!inv.customerName || /^walk[- ]?in/i.test(inv.customerName));
      const key = inv.memberId ? `m${inv.memberId}` : walkIn ? "walkin" : `n${(inv.customerName || "").toLowerCase()}`;
      const v = custMap.get(key) ?? { name: walkIn ? "Walk-in customers" : inv.customerName, phone: walkIn ? "" : inv.customerPhone || "", type: inv.memberId ? "Member" : walkIn ? "Walk-in" : "Customer", count: 0, items: 0, amount: 0, due: 0, last: "" };
      v.count++; v.items += itemCount(inv); v.amount += netSale(inv); v.due += balanceDue(inv);
      if ((inv.invoiceDate || "") > v.last) v.last = inv.invoiceDate;
      custMap.set(key, v);
    }
    const custRows: Row[] = [...custMap.entries()].sort((a, b) => b[1].amount - a[1].amount)
      .filter(([, v]) => !q || v.name.toLowerCase().includes(q) || v.phone.includes(q))
      .map(([key, v]) => ({ key, cells: [v.name, v.type, v.phone || "—", v.count, v.items, v.amount, v.due, v.last] }));

    // Payments
    const payMap = new Map<string, { count: number; amount: number }>();
    for (const inv of sales) for (const l of paymentLegs(inv)) {
      const v = payMap.get(l.method) ?? { count: 0, amount: 0 };
      v.count++; v.amount += l.amount; payMap.set(l.method, v);
    }
    const paidTotal = [...payMap.values()].reduce((s, v) => s + v.amount, 0);
    const payRows: Row[] = [...payMap.entries()].sort((a, b) => b[1].amount - a[1].amount)
      .map(([m, v]) => ({ key: m, cells: [prettyMethod(m) || m, v.count, v.amount, pct(v.amount, paidTotal + t.due)] }));
    if (t.due > 0.005) payRows.push({ key: "__due", cells: ["Not paid yet (balance due)", sales.filter(i => balanceDue(i) > 0.005).length, t.due, pct(t.due, paidTotal + t.due)] });

    // Returns
    const retRows: Row[] = salesSearched.filter(i => Number(i.returnedAmount) > 0)
      .sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
      .map(inv => ({ key: String(inv.id), cells: [inv.invoiceNumber, inv.invoiceDate, inv.customerName || "Walk-in", Number(inv.totalAmount) || 0, Number(inv.returnedAmount) || 0, netSale(inv), pct(Number(inv.returnedAmount) || 0, Number(inv.totalAmount) || 0)] }));

    // Purchase register
    const billStatus = (b: SupplierBill): StatusVal => {
      const due = Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.amountPaid) || 0));
      if (due <= 0.005) return "paid";
      if (b.dueDate && b.dueDate < today) return "overdue";
      return (Number(b.amountPaid) || 0) > 0 ? "part paid" : "unpaid";
    };
    const purRows: Row[] = [...purchasesSearched].sort((a, b) => (b.billDate || "").localeCompare(a.billDate || ""))
      .map(b => {
        const total = Number(b.totalAmount) || 0, paid = Number(b.amountPaid) || 0;
        return {
          key: String(b.id),
          cells: [b.billNumber, b.billDate, b.supplierName, b.dueDate || "", billStatus(b), (Number(b.subtotal) || 0) - (Number(b.discountAmount) || 0), Number(b.taxAmount) || 0, total, paid, Math.max(0, total - paid)],
          sub: [b.invoiceNumber ? `Supplier inv. ${b.invoiceNumber}` : null, null, null, null, null, null, null, null, null, null],
        };
      });

    // Suppliers
    const supMap = new Map<string, { count: number; total: number; paid: number; overdue: number; last: string }>();
    for (const b of purchases) {
      const v = supMap.get(b.supplierName || "Supplier") ?? { count: 0, total: 0, paid: 0, overdue: 0, last: "" };
      const total = Number(b.totalAmount) || 0, paid = Number(b.amountPaid) || 0;
      v.count++; v.total += total; v.paid += paid;
      if (b.dueDate && b.dueDate < today) v.overdue += Math.max(0, total - paid);
      if ((b.billDate || "") > v.last) v.last = b.billDate;
      supMap.set(b.supplierName || "Supplier", v);
    }
    const supRows: Row[] = [...supMap.entries()].sort((a, b) => b[1].total - a[1].total)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .map(([name, v]) => ({ key: name, cells: [name, v.count, v.total, v.paid, Math.max(0, v.total - v.paid), v.overdue, v.last] }));

    // Purchases by product
    const boughtMap = new Map<string, { name: string; sku: string; qty: number; amount: number; bills: number; suppliers: Set<string> }>();
    for (const b of purchases) for (const it of b.items ?? []) {
      const key = it.productId ? `p${it.productId}` : `n${it.productName}`;
      const v = boughtMap.get(key) ?? { name: it.productName || "Item", sku: it.productSku || "", qty: 0, amount: 0, bills: 0, suppliers: new Set<string>() };
      v.qty += Number(it.quantity) || 0; v.amount += Number(it.totalAmount) || 0; v.bills++; v.suppliers.add(b.supplierName);
      boughtMap.set(key, v);
    }
    const boughtRows: Row[] = [...boughtMap.entries()].sort((a, b) => b[1].amount - a[1].amount)
      .filter(([, v]) => !q || v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
      .map(([key, v]) => ({ key, cells: [v.name, v.sku, v.qty, v.qty > 0 ? v.amount / v.qty : 0, v.amount, v.bills, [...v.suppliers].join(", ")] }));

    return {
      register: {
        title: "Sales register", sub: "Every confirmed sale in the range, newest first — amounts net of returns", icon: ShoppingBag, file: `sales-register_${rangeTxt}`,
        cols: [{ label: "Invoice" }, { label: "Date", kind: "date" }, { label: "Customer" }, { label: "Items", kind: "text" }, { label: "Paid by" }, { label: "Status", kind: "status" },
          { label: "Before tax", kind: "money" }, { label: "Tax", kind: "money" }, { label: "Returned", kind: "money" }, { label: "Net sale", kind: "money" }, { label: "Paid", kind: "money" }, { label: "Balance", kind: "money" }],
        rows: regRows, empty: "No sales match these filters.",
        foot: [`${regRows.length} sales`, null, null, null, null, null, sumCol(regRows, 6), sumCol(regRows, 7), sumCol(regRows, 8), sumCol(regRows, 9), sumCol(regRows, 10), sumCol(regRows, 11)],
      },
      daily: {
        title: "Daily summary", sub: "Sales, tax, returns, cost and gross profit per day", icon: CalendarDays, file: `daily-sales_${rangeTxt}`,
        cols: [{ label: "Date", kind: "date" }, { label: "Sales", kind: "int" }, { label: "Items", kind: "int" }, { label: "Before tax", kind: "money" }, { label: "Tax", kind: "money" },
          { label: "Returned", kind: "money" }, { label: "Net sales", kind: "money" }, { label: "Cost of goods", kind: "money" }, { label: "Gross profit", kind: "money" }, { label: "Margin", kind: "pct" }],
        rows: dayRows, empty: "No sales in this range.",
        foot: [`${dayRows.length} days`, sumCol(dayRows, 1), sumCol(dayRows, 2), sumCol(dayRows, 3), sumCol(dayRows, 4), sumCol(dayRows, 5), sumCol(dayRows, 6), sumCol(dayRows, 7), sumCol(dayRows, 8), t.revenue > 0 ? pct(t.profit, t.revenue) : null],
      },
      products: {
        title: "Sales by product", sub: "Quantity and value sold per product, net of returns", icon: Package, file: `sales-by-product_${rangeTxt}`,
        cols: [{ label: "Product" }, { label: "SKU" }, { label: "Category" }, { label: "Qty sold", kind: "qty" }, { label: "Sales", kind: "int" }, { label: "Avg price", kind: "money" }, { label: "Net sales", kind: "money" }, { label: "Share", kind: "pct" }],
        rows: prodRows, empty: "No products sold in this range.",
        foot: [`${prodRows.length} products`, null, null, sumCol(prodRows, 3), null, null, sumCol(prodRows, 6), pct(sumCol(prodRows, 6), itemsTotal)],
      },
      categories: {
        title: "Sales by category", sub: "Item sales grouped by product category", icon: Layers, file: `sales-by-category_${rangeTxt}`,
        cols: [{ label: "Category" }, { label: "Products", kind: "int" }, { label: "Qty sold", kind: "qty" }, { label: "Net sales", kind: "money" }, { label: "Share", kind: "pct" }],
        rows: catRows, empty: "No products sold in this range.",
        foot: [`${catRows.length} categories`, sumCol(catRows, 1), sumCol(catRows, 2), sumCol(catRows, 3), pct(sumCol(catRows, 3), itemsTotal)],
      },
      customers: {
        title: "Sales by customer", sub: "Spend per member or named customer; walk-ins grouped together", icon: Users, file: `sales-by-customer_${rangeTxt}`,
        cols: [{ label: "Customer" }, { label: "Type" }, { label: "Phone" }, { label: "Purchases", kind: "int" }, { label: "Items", kind: "int" }, { label: "Net sales", kind: "money" }, { label: "Balance due", kind: "money" }, { label: "Last purchase", kind: "date" }],
        rows: custRows, empty: "No sales in this range.",
        foot: [`${custRows.length} customers`, null, null, sumCol(custRows, 3), sumCol(custRows, 4), sumCol(custRows, 5), sumCol(custRows, 6), null],
      },
      payments: {
        title: "Payment methods", sub: "Money recorded on this range's sales by method, plus what's still unpaid", icon: CreditCard, file: `payment-methods_${rangeTxt}`,
        cols: [{ label: "Method" }, { label: "Payments", kind: "int" }, { label: "Amount", kind: "money" }, { label: "Share", kind: "pct" }],
        rows: payRows, empty: "No payments in this range.",
        foot: ["Total", null, sumCol(payRows, 2), payRows.length ? 100 : null],
      },
      returns: {
        title: "Returns", sub: "Sales in this range that had items returned", icon: RotateCcw, file: `sales-returns_${rangeTxt}`,
        cols: [{ label: "Invoice" }, { label: "Date", kind: "date" }, { label: "Customer" }, { label: "Sale total", kind: "money" }, { label: "Returned", kind: "money" }, { label: "Kept", kind: "money" }, { label: "Returned %", kind: "pct" }],
        rows: retRows, empty: "No returns in this range.",
        foot: [`${retRows.length} sales`, null, null, sumCol(retRows, 3), sumCol(retRows, 4), sumCol(retRows, 5), pct(sumCol(retRows, 4), sumCol(retRows, 3))],
      },
      purchases: {
        title: "Purchase register", sub: "Confirmed supplier bills in the range, newest first", icon: Receipt, file: `purchase-register_${rangeTxt}`,
        cols: [{ label: "Bill" }, { label: "Bill date", kind: "date" }, { label: "Supplier" }, { label: "Due", kind: "date" }, { label: "Status", kind: "status" },
          { label: "Before tax", kind: "money" }, { label: "Tax", kind: "money" }, { label: "Total", kind: "money" }, { label: "Paid", kind: "money" }, { label: "Balance", kind: "money" }],
        rows: purRows, empty: "No supplier bills match these filters.",
        foot: [`${purRows.length} bills`, null, null, null, null, sumCol(purRows, 5), sumCol(purRows, 6), sumCol(purRows, 7), sumCol(purRows, 8), sumCol(purRows, 9)],
      },
      suppliers: {
        title: "Purchases by supplier", sub: "What was billed, paid and still owed per supplier", icon: Truck, file: `purchases-by-supplier_${rangeTxt}`,
        cols: [{ label: "Supplier" }, { label: "Bills", kind: "int" }, { label: "Billed", kind: "money" }, { label: "Paid", kind: "money" }, { label: "Owed", kind: "money" }, { label: "Overdue", kind: "money" }, { label: "Last bill", kind: "date" }],
        rows: supRows, empty: "No supplier bills in this range.",
        foot: [`${supRows.length} suppliers`, sumCol(supRows, 1), sumCol(supRows, 2), sumCol(supRows, 3), sumCol(supRows, 4), sumCol(supRows, 5), null],
      },
      bought: {
        title: "Purchases by product", sub: "Quantity and value bought per product on supplier bills", icon: Package, file: `purchases-by-product_${rangeTxt}`,
        cols: [{ label: "Product" }, { label: "SKU" }, { label: "Qty bought", kind: "qty" }, { label: "Avg cost", kind: "money" }, { label: "Amount", kind: "money" }, { label: "Bill lines", kind: "int" }, { label: "Suppliers" }],
        rows: boughtRows, empty: "No products bought in this range.",
        foot: [`${boughtRows.length} products`, null, sumCol(boughtRows, 2), null, sumCol(boughtRows, 4), sumCol(boughtRows, 5), null],
      },
    };
  }, [sales, salesSearched, purchases, purchasesSearched, productById, q, range, t, today]);

  const r = reports[report];

  const display = (v: string | number | null, kind?: Kind) => {
    if (v == null || v === "") return kind === "money" || kind === "pct" ? "—" : "";
    switch (kind) {
      case "money": return money(Number(v));
      case "int": return fmtInt(Number(v));
      case "qty": return (Math.round(Number(v) * 100) / 100).toLocaleString();
      case "pct": return `${Number(v).toFixed(1)}%`;
      case "date": return fmtDate(String(v));
      case "status": return <Status kind={STATUS_KIND[v as StatusVal] ?? "info"}>{String(v)}</Status>;
      default: return String(v);
    }
  };
  // Export / print: the selected report exactly as listed (every row), with the page's headline figures
  const buildReport = (): ReportDocument => {
    const fmtOf = (kind?: Kind): ValueFormat =>
      kind === "money" ? "money" : kind === "int" ? "integer" : kind === "qty" ? "number" : kind === "pct" ? "percent" : kind === "date" ? "date" : "text";
    const columns = r.cols.map((c, i) => ({ key: `c${i}`, header: c.label, format: fmtOf(c.kind) }));
    const toRow = (cells: (string | number | null)[], kind?: "total"): ReportRow => {
      const row: ReportRow = kind ? { _kind: kind } : {};
      cells.forEach((v, i) => { row[`c${i}`] = v; });
      return row;
    };
    const rows = r.rows.map(row => toRow(row.cells));
    if (r.foot && rows.length) rows.push(toRow(r.foot.map((v, i) => (i === 0 ? (v == null ? "Total" : `Total — ${v}`) : v)), "total"));
    return {
      title: r.title,
      fileName: r.title,
      subtitle: r.sub,
      period: { from: range.from, to: range.to },
      filters: [
        ...(!isPurchaseReport ? [{ label: "Sales channel", value: source === "pos" ? "POS" : source === "manual" ? "Invoices" : "All sales" }] : []),
        { label: "Search", value: search.trim() || undefined },
      ],
      sections: [
        kpiSection([
          { label: "Net sales", value: t.sales, format: "money", hint: `${fmtInt(t.count)} sales` },
          { label: "Gross profit", value: t.profit, format: "money", hint: margin != null ? `${margin.toFixed(1)}% margin` : undefined },
          { label: "Tax collected", value: t.tax, format: "money" },
          { label: "Returns", value: t.returned, format: "money" },
          { label: "Purchases", value: bought, format: "money", hint: `${fmtInt(purchases.length)} supplier bills` },
          { label: "Customers owe", value: t.due, format: "money" },
          { label: "Owed to suppliers", value: owedSuppliers, format: "money" },
        ], "Summary"),
        { kind: "table", title: r.title, columns, rows, emptyText: r.empty },
      ],
    };
  };

  const reportTabs: { id: ReportId; label: string; icon: IconT; count?: number }[] = [
    { id: "register", label: "Sales register", icon: ShoppingBag },
    { id: "daily", label: "Daily summary", icon: CalendarDays },
    { id: "products", label: "By product", icon: Package },
    { id: "categories", label: "By category", icon: Layers },
    { id: "customers", label: "By customer", icon: Users },
    { id: "payments", label: "Payment methods", icon: CreditCard },
    { id: "returns", label: "Returns", icon: RotateCcw, count: reports.returns.rows.length },
    { id: "purchases", label: "Purchase register", icon: Receipt },
    { id: "suppliers", label: "By supplier", icon: Truck },
    { id: "bought", label: "Bought by product", icon: Package },
  ];
  const margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : null;

  if (loading && !invoices.length && !bills.length) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading reports…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Sales & Purchase Reports</h1>
          <div className={styles.subtitle}>{fmtDate(range.from)}{range.from !== range.to ? ` – ${fmtDate(range.to)}` : ""} · confirmed POS sales, sales invoices and supplier bills</div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/sales-analytics")}><BarChart3 className="h-4 w-4 mr-2" />Analytics</Button>
        </div>
      </div>

      {/* Filters — one row above everything they control */}
      <div className={`${styles.card} ${styles.filters}`}>
        <div className={styles.chips} role="tablist" aria-label="Date range">
          {PRESETS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={preset === id} data-active={preset === id} className={styles.chip}
              onClick={() => { if (id === "custom") setCustom(range); setPreset(id); }}>{label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className={styles.customRange}>
            <Input type="date" aria-label="From" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value || c.from }))} />
            <span className={styles.muted}>to</span>
            <Input type="date" aria-label="To" value={custom.to} min={custom.from} onChange={e => setCustom(c => ({ ...c, to: e.target.value || c.to }))} />
          </div>
        )}
        <div className={styles.filterEnd}>
          {!isPurchaseReport && <Seg value={source} onChange={setSource} label="Sales channel" options={[["all", "All sales"], ["pos", "POS"], ["manual", "Invoices"]]} />}
          <div style={{ position: "relative", width: "15rem" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isPurchaseReport ? "Bill, supplier, product…" : "Invoice, customer, product…"} style={{ paddingLeft: 32 }} aria-label="Search the report" />
          </div>
        </div>
      </div>

      {failed.length > 0 && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--destructive)" }}>
          <AlertTriangle size={16} />Couldn't load {failed.join(", ")}. Reports using them may be incomplete.
        </div>
      )}

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={styles.kpis}>
          <Kpi icon={ShoppingCart} tone="blue" label="Net sales" value={money0(t.sales)} hint={`${fmtInt(t.count)} sale${t.count === 1 ? "" : "s"}`} onClick={() => setReport("register")} />
          <Kpi icon={TrendingUp} tone={t.profit < 0 ? "red" : "green"} label="Gross profit" value={money0(t.profit)} hint={margin != null ? `${margin.toFixed(1)}% margin` : "no sales"} onClick={() => setReport("daily")} />
          <Kpi icon={Wallet} tone="teal" label="Tax collected" value={money0(t.tax)} hint={`on ${money0(t.revenue)} before tax`} />
          <Kpi icon={RotateCcw} tone="amber" label="Returns" value={money0(t.returned)} hint={t.gross > 0 ? `${((t.returned / t.gross) * 100).toFixed(1)}% of sales` : "no sales"} onClick={() => setReport("returns")} />
          <Kpi icon={Truck} tone="orange" label="Purchases" value={money0(bought)} hint={`${fmtInt(purchases.length)} supplier bill${purchases.length === 1 ? "" : "s"}`} onClick={() => setReport("purchases")} />
          <Kpi icon={FileSpreadsheet} tone={t.due + owedSuppliers > 0 ? "violet" : "green"} label="Open balances" value={money0(t.due)}
            hint={`customers owe · ${money0(owedSuppliers)} owed to suppliers`} onClick={() => setReport("customers")} />
        </div>

        <SectionTabs tabs={reportTabs} value={report} onChange={setReport} label="Reports" />

        <Panel title={r.title} icon={r.icon} sub={r.sub}
          action={
            <ReportActions report={buildReport} disabled={loading} menuLabel={r.title} compact />
          }>
          {r.rows.length === 0 ? <Empty icon={r.icon} title={r.empty} text={q ? "Try clearing the search or widening the date range." : "Try a wider date range."} /> : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>{r.cols.map((c, i) => <th key={i} className={c.kind && c.kind !== "text" && c.kind !== "date" && c.kind !== "status" ? styles.num : undefined}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {r.rows.slice(0, shown).map(row => (
                      <tr key={row.key}>
                        {row.cells.map((v, i) => {
                          const kind = r.cols[i].kind;
                          const numeric = kind && kind !== "text" && kind !== "date" && kind !== "status";
                          return (
                            <td key={i} className={numeric ? styles.num : i > 1 && kind !== "status" && kind !== "date" ? styles.muted : undefined}
                              style={i === 0 ? { fontWeight: 600 } : kind === "money" && (r.cols[i].label === "Net sale" || r.cols[i].label === "Net sales" || r.cols[i].label === "Amount" || r.cols[i].label === "Billed") ? { fontWeight: 700 } : undefined}>
                              {display(v, kind)}
                              {row.sub?.[i] && <div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{row.sub[i]}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {r.foot && (
                    <tfoot>
                      <tr>{r.foot.map((v, i) => {
                        const kind = r.cols[i].kind;
                        const numeric = kind && kind !== "text" && kind !== "date" && kind !== "status";
                        return <td key={i} className={numeric ? styles.num : undefined}>{i === 0 ? v : v == null ? "" : display(v, kind === "status" || kind === "date" ? "text" : kind)}</td>;
                      })}</tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {r.rows.length > shown && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: "0.75rem" }}>
                  <span className={styles.muted} style={{ fontSize: "var(--text-xs)" }}>Showing {fmtInt(shown)} of {fmtInt(r.rows.length)} · totals and exports include every row</span>
                  <Button variant="outline" size="sm" onClick={() => setShown(s => s + PAGE)}>Show {Math.min(PAGE, r.rows.length - shown)} more</Button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
