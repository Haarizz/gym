import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Clock, CreditCard, Download, FileText, Layers, Lightbulb,
  Package, Percent, RefreshCw, RotateCcw, ShoppingBag, ShoppingCart, Truck, TrendingUp, Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import type { SalesInvoice } from "../utils/supabase/sales-invoice-service";
import type { SupplierBill } from "../utils/supabase/supplier-bill-service";
import type { Product } from "../utils/supabase/products-service";
import { ReportActions, type ReportDocument, changeHint, chartFromRows, col, countCol, kpiSection, moneyCol, pieSection, tableSection } from "../components/report-export";
import {
  styles, rs, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, Seg, Status, Delta,
  pctChange, fmtInt, fmtDate, isoDate, Period, periodRange, PERIOD_OPTIONS,
} from "../components/overview/overview-kit";
import {
  inRange, keptShare, netSale, totalsOf, paymentLegs, daysBetween,
  loadConfirmedInvoices, loadConfirmedBills, loadAllProducts,
} from "../components/sales/sales-data";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Sequential blue ramp (one hue, light → dark), dark steps selected separately — same as the Analytics Dashboard. */
const HEAT_LIGHT = ["#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#184f95"];
const HEAT_DARK = ["#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"];

type Bucket = { key: string; label: string; tipLabel: string; from: string; to: string };

/** Day buckets for up to ~2 months, weeks (Mon–Sun) up to ~4½ months, months beyond. */
function bucketsFor(from: string, to: string): { unit: "day" | "week" | "month"; list: Bucket[] } {
  const days = daysBetween(from, to);
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const list: Bucket[] = [];
  if (days <= 62) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = isoDate(d);
      list.push({ key: k, from: k, to: k, label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), tipLabel: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" }) });
    }
    return { unit: "day", list };
  }
  if (days <= 140) {
    const d = new Date(start);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    for (; d <= end; d.setDate(d.getDate() + 7)) {
      const wEnd = new Date(d); wEnd.setDate(wEnd.getDate() + 6);
      const f = isoDate(d < start ? start : d), t = isoDate(wEnd > end ? end : wEnd);
      list.push({ key: f, from: f, to: t, label: new Date(f + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }), tipLabel: `Week of ${fmtDate(f)}` });
    }
    return { unit: "week", list };
  }
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const f = isoDate(d < start ? start : d), t = isoDate(mEnd > end ? end : mEnd);
    list.push({ key: f, from: f, to: t, label: d.toLocaleDateString(undefined, { month: "short" }), tipLabel: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) });
  }
  return { unit: "month", list };
}

/**
 * Sales Analytics (Sales & Purchases › Analytics): how sales are going for the chosen period —
 * trend, when sales happen, what sells, who buys, how they pay, stock risk on best sellers and
 * buying. Built on the same data rules as the module overview (components/sales/sales-data.ts).
 */
export function SalesAnalytics() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const { formatCurrency, currencyCode } = useCurrency();
  const palette = usePalette();
  const dark = palette.grid !== "#e9e8e3";
  const heatRamp = dark ? HEAT_DARK : HEAT_LIGHT;
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const [period, setPeriod] = useState<Period>("mtd");
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [heatHover, setHeatHover] = useState<string | null>(null);
  const range = useMemo(() => periodRange(period), [period]);

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

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const cur = useMemo(() => invoices.filter(i => inRange(i.invoiceDate, range.from, range.to)), [invoices, range]);
  const prev = useMemo(() => invoices.filter(i => inRange(i.invoiceDate, range.compareFrom, range.compareTo)), [invoices, range]);
  const t = useMemo(() => totalsOf(cur), [cur]);
  const p = useMemo(() => totalsOf(prev), [prev]);
  const margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : null;
  const returnRate = t.gross > 0 ? (t.returned / t.gross) * 100 : 0;

  // ── Trend ──
  const trend = useMemo(() => {
    const { unit, list } = bucketsFor(range.from, range.to);
    const rows = list.map(b => {
      const tot = totalsOf(cur.filter(i => inRange(i.invoiceDate, b.from, b.to)));
      return { label: b.label, tipLabel: b.tipLabel, sales: Math.round(tot.sales), profit: Math.round(tot.profit), count: tot.count };
    });
    return { unit, rows };
  }, [cur, range]);
  const bestBucket = trend.rows.reduce((m, r) => (r.sales > (m?.sales ?? 0) ? r : m), null as null | (typeof trend.rows)[number]);

  // ── Products & categories (line values net of the invoice's returned share) ──
  const productStats = useCallback((invs: SalesInvoice[]) => {
    const by = new Map<string, { id?: number; name: string; qty: number; amount: number; invoices: number }>();
    for (const inv of invs) {
      const kept = keptShare(inv);
      const seen = new Set<string>();
      for (const it of inv.items ?? []) {
        const key = it.productId ? `p${it.productId}` : `n${it.productName}`;
        const v = by.get(key) ?? { id: it.productId || undefined, name: it.productName || "Item", qty: 0, amount: 0, invoices: 0 };
        v.qty += (Number(it.quantity) || 0) * kept;
        v.amount += (Number(it.totalAmount) || 0) * kept;
        if (!seen.has(key)) { v.invoices++; seen.add(key); }
        by.set(key, v);
      }
    }
    return by;
  }, []);
  const curProducts = useMemo(() => productStats(cur), [cur, productStats]);
  const prevProducts = useMemo(() => productStats(prev), [prev, productStats]);
  const productRows = useMemo(() => [...curProducts.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.amount - a.amount), [curProducts]);
  const itemsTotal = productRows.reduce((s, r) => s + r.amount, 0);

  const categoryRows = useMemo(() => {
    const by = new Map<string, { amount: number; qty: number }>();
    for (const r of productRows) {
      const cat = (r.id && productById.get(r.id)?.categoryName) || "Uncategorised";
      const v = by.get(cat) ?? { amount: 0, qty: 0 };
      v.amount += r.amount; v.qty += r.qty;
      by.set(cat, v);
    }
    return [...by.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8).map(([name, v]) => ({
      key: name, label: name, value: v.amount, color: palette.s4,
      meta: `${itemsTotal > 0 ? Math.round((v.amount / itemsTotal) * 100) : 0}% · ${fmtInt(v.qty)} sold`,
    }));
  }, [productRows, productById, itemsTotal, palette]);

  const bestSellerRows = productRows.slice(0, 8).map(r => ({
    key: r.key, label: r.name, value: r.amount, color: palette.s1,
    meta: `${fmtInt(r.qty)} sold · ${r.qty > 0 ? money(r.amount / r.qty) : "—"} each`,
  }));

  const movers = useMemo(() => {
    const keys = new Set([...curProducts.keys(), ...prevProducts.keys()]);
    const rows = [...keys].map(k => {
      const now = curProducts.get(k)?.amount ?? 0, before = prevProducts.get(k)?.amount ?? 0;
      return { key: k, name: curProducts.get(k)?.name ?? prevProducts.get(k)?.name ?? "Item", now, before, diff: now - before };
    }).filter(r => r.now > 0 || r.before > 0);
    const up = rows.filter(r => r.diff > 0.5).sort((a, b) => b.diff - a.diff).slice(0, 4);
    const down = rows.filter(r => r.diff < -0.5).sort((a, b) => a.diff - b.diff).slice(0, 4);
    return { up, down };
  }, [curProducts, prevProducts]);

  // ── Customers ──
  const customerRows = useMemo(() => {
    const by = new Map<string, { amount: number; count: number }>();
    for (const inv of cur) {
      const name = (inv.customerName || "").trim();
      if (!name || inv.customerType === "WALK_IN" || /^walk[- ]?in/i.test(name)) continue;
      const k = inv.memberId ? `m${inv.memberId}` : `n${name.toLowerCase()}`;
      const v = by.get(k) ?? { amount: 0, count: 0, name } as any;
      v.amount += netSale(inv); v.count++; v.name = name;
      by.set(k, v);
    }
    return [...by.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8)
      .map(([k, v]: any) => ({ key: k, label: v.name, value: v.amount, color: palette.s6, meta: `${v.count} purchase${v.count === 1 ? "" : "s"}` }));
  }, [cur, palette]);
  const walkInSales = cur.filter(i => !i.memberId).reduce((s, i) => s + netSale(i), 0);
  const memberSales = t.sales - walkInSales;

  // ── Payments & channels ──
  const payments = useMemo(() => {
    const by = new Map<string, number>();
    for (const inv of cur) for (const l of paymentLegs(inv)) by.set(l.method, (by.get(l.method) ?? 0) + l.amount);
    const colors = [palette.s1, palette.s2, palette.s3, palette.s4, palette.s5, palette.s6];
    const sorted = [...by.entries()].sort((a, b) => b[1] - a[1]);
    // Never more than 6 slices: the rest fold into "Other" (fixed colour order, never cycled).
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const rows = [...top, ...(rest > 0 ? [["Other", rest] as [string, number]] : [])];
    const total = rows.reduce((s, [, v]) => s + v, 0);
    return { total, rows: rows.map(([name, amount], i) => ({ name, amount, color: colors[i], pct: total > 0 ? Math.round((amount / total) * 100) : 0 })) };
  }, [cur, palette]);
  const pos = useMemo(() => totalsOf(cur.filter(i => i.source === "POS")), [cur]);
  const manual = useMemo(() => totalsOf(cur.filter(i => i.source !== "POS")), [cur]);

  // ── When sales happen (time the sale was recorded) ──
  const heat = useMemo(() => {
    const grid = WEEKDAYS.map(() => Array(24).fill(0) as number[]);
    const amt = WEEKDAYS.map(() => Array(24).fill(0) as number[]);
    let total = 0;
    for (const inv of cur) {
      const d = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const di = (d.getDay() + 6) % 7, h = d.getHours();
      grid[di][h]++; amt[di][h] += netSale(inv); total++;
    }
    let lo = 23, hi = 0;
    grid.forEach(row => row.forEach((v, h) => { if (v > 0) { lo = Math.min(lo, h); hi = Math.max(hi, h); } }));
    if (total === 0) { lo = 6; hi = 22; }
    lo = Math.max(0, Math.min(lo, 8)); hi = Math.min(23, Math.max(hi, 21));
    const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const max = Math.max(0, ...grid.flat());
    const byDay = WEEKDAYS.map((day, i) => ({ day, n: grid[i].reduce((s, v) => s + v, 0), amt: amt[i].reduce((s, v) => s + v, 0) }));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ h, n: grid.reduce((s, row) => s + row[h], 0) }));
    let peak = { di: 0, h: 0, v: 0 };
    grid.forEach((row, di) => row.forEach((v, h) => { if (v > peak.v) peak = { di, h, v }; }));
    return { grid, amt, total, hours, max, byDay, byHour, peak };
  }, [cur]);
  const heatColor = (v: number) => {
    if (v <= 0 || heat.max <= 0) return undefined;
    return heatRamp[Math.max(0, Math.min(4, Math.floor((v / heat.max) * 5 - 1e-9)))];
  };
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const busiestDay = [...heat.byDay].sort((a, b) => b.n - a.n)[0];
  const peakHour = [...heat.byHour].sort((a, b) => b.n - a.n)[0];

  // ── Stock watch: best sellers running low ──
  const stockWatch = useMemo(() => productRows.slice(0, 20)
    .map(r => ({ ...r, product: r.id ? productById.get(r.id) : undefined }))
    .filter(r => r.product && (r.product.stockStatus === "LOW_STOCK" || r.product.stockStatus === "OUT_OF_STOCK"))
    .slice(0, 6), [productRows, productById]);
  const days = daysBetween(range.from, range.to);

  // ── Buying ──
  const curBills = useMemo(() => bills.filter(b => inRange(b.billDate, range.from, range.to)), [bills, range]);
  const bought = curBills.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
  const boughtPrev = bills.filter(b => inRange(b.billDate, range.compareFrom, range.compareTo)).reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
  const supplierRows = useMemo(() => {
    const by = new Map<string, { amount: number; count: number }>();
    for (const b of curBills) {
      const v = by.get(b.supplierName || "Supplier") ?? { amount: 0, count: 0 };
      v.amount += Number(b.totalAmount) || 0; v.count++;
      by.set(b.supplierName || "Supplier", v);
    }
    return [...by.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 5)
      .map(([name, v]) => ({ key: name, label: name, value: v.amount, color: palette.s2, meta: `${v.count} bill${v.count === 1 ? "" : "s"}` }));
  }, [curBills, palette]);

  // ── Insights (plain statements from the figures above) ──
  const insights = useMemo(() => {
    const out: { type: "positive" | "warning" | "critical" | "info"; tag: string; title: string; detail: string; icon: typeof TrendingUp }[] = [];
    const ch = pctChange(t.sales, p.sales);
    if (ch != null) out.push({
      type: ch >= 0 ? "positive" : "warning", tag: "Sales", icon: ch >= 0 ? ArrowUpRight : ArrowDownRight,
      title: `Sales ${ch >= 0 ? "up" : "down"} ${Math.abs(ch)}% ${range.vs}`,
      detail: `${money(t.sales)} from ${fmtInt(t.count)} sale${t.count === 1 ? "" : "s"}, against ${money(p.sales)} before.`,
    });
    if (productRows[0] && itemsTotal > 0) out.push({
      type: "info", tag: "Best seller", icon: Package,
      title: `${productRows[0].name} — ${Math.round((productRows[0].amount / itemsTotal) * 100)}% of item sales`,
      detail: `${fmtInt(productRows[0].qty)} sold for ${money(productRows[0].amount)}.`,
    });
    if (heat.peak.v > 0) out.push({
      type: "info", tag: "Busiest time", icon: Clock,
      title: `${WEEKDAYS[heat.peak.di]} around ${hh(heat.peak.h)}`,
      detail: `${busiestDay?.day} is the busiest day (${fmtInt(busiestDay?.n)} sales); ${hh(peakHour?.h ?? 0)} the busiest hour. Plan staff and stock for it.`,
    });
    if (stockWatch.length) {
      const out0 = stockWatch.filter(s => s.product?.stockStatus === "OUT_OF_STOCK").length;
      out.push({
        type: out0 ? "critical" : "warning", tag: "Stock", icon: Boxes,
        title: `${stockWatch.length} best seller${stockWatch.length === 1 ? "" : "s"} ${out0 ? `· ${out0} out of stock` : "running low"}`,
        detail: stockWatch.slice(0, 3).map(s => s.name).join(", ") + ". Reorder before they run out.",
      });
    }
    if (t.returned > 0) out.push({
      type: returnRate > 5 ? "warning" : "info", tag: "Returns", icon: RotateCcw,
      title: `${returnRate.toFixed(1)}% of sales returned`,
      detail: `${money(t.returned)} came back on ${fmtInt(cur.filter(i => Number(i.returnedAmount) > 0).length)} sale(s).`,
    });
    if (margin != null && t.cost > 0) out.push({
      type: margin < 20 ? "warning" : "positive", tag: "Margin", icon: Percent,
      title: `${margin.toFixed(1)}% gross margin`,
      detail: margin < 20 ? "Low for retail — check cost prices and discounts on your best sellers." : `${money(t.profit)} gross profit after the cost of goods sold.`,
    });
    if (t.due > 0.5) out.push({
      type: "warning", tag: "Unpaid", icon: CreditCard,
      title: `${money(t.due)} still to collect`,
      detail: `${fmtInt(cur.filter(i => netSale(i) - (Number(i.amountPaid) || 0) > 0.005).length)} sale(s) in this period aren't fully paid.`,
    });
    return out.slice(0, 6);
  }, [t, p, range, money, productRows, itemsTotal, heat, busiestDay, peakHour, stockWatch, returnRate, cur, margin]);

  // Export / print: every panel, plus the full product list
  const buildReport = (): ReportDocument => ({
    title: "Sales Analytics",
    period: { from: range.from, to: range.to, label: range.label },
    filters: [{ label: "Compared with", value: `${fmtDate(range.compareFrom)} – ${fmtDate(range.compareTo)}` }],
    sections: [
      kpiSection([
        { label: "Net sales", value: t.sales, format: "money", ...changeHint(pctChange(t.sales, p.sales)) },
        { label: "Gross profit", value: t.profit, format: "money", hint: margin != null ? `${margin.toFixed(1)}% margin` : undefined },
        { label: "Sales", value: t.count, format: "integer", ...changeHint(pctChange(t.count, p.count)) },
        { label: "Returns", value: t.returned, format: "money", hint: `${returnRate.toFixed(1)}% of sales` },
        { label: "Member sales", value: memberSales, format: "money" },
        { label: "Walk-in sales", value: walkInSales, format: "money" },
        { label: "Still to collect", value: t.due, format: "money" },
        { label: "Purchases", value: bought, format: "money", ...changeHint(pctChange(bought, boughtPrev)) },
      ], "Key figures"),
      chartFromRows(`Sales and profit by ${trend.unit}`, "bar", trend.rows, "tipLabel", [{ key: "sales", name: "Sales", color: "#2a78d6" }, { key: "profit", name: "Gross profit", color: "#1baf7a" }], { valueFormat: "money" }),
      tableSection("Sales trend", [col("tipLabel", "Period"), moneyCol("sales", "Sales"), moneyCol("profit", "Gross profit"), countCol("count", "Sales")], trend.rows, { totals: true }),
      tableSection("Channels", [col("name", "Channel"), moneyCol("sales", "Net sales"), moneyCol("profit", "Gross profit"), countCol("count", "Sales")],
        [{ name: "Point of Sale", sales: pos.sales, profit: pos.profit, count: pos.count }, { name: "Sales invoices", sales: manual.sales, profit: manual.profit, count: manual.count }], { totals: true }),
      pieSection("Payment methods", payments.rows.map(r => ({ label: r.name, value: r.amount })), { valueFormat: "money" }),
      tableSection("Sales by category", [col("label", "Category"), moneyCol("value", "Net sales"), col("meta", "Share · qty")], categoryRows, { totals: true }),
      tableSection("Top customers", [col("label", "Customer"), moneyCol("value", "Net sales"), col("meta", "Purchases")], customerRows, { totals: true }),
      tableSection("Rising products", [col("name", "Product"), moneyCol("now", "This period"), moneyCol("before", "Before"), moneyCol("diff", "Change")], movers.up),
      tableSection("Falling products", [col("name", "Product"), moneyCol("now", "This period"), moneyCol("before", "Before"), moneyCol("diff", "Change")], movers.down),
      tableSection("Sales by weekday", [col("day", "Weekday"), countCol("n", "Sales"), moneyCol("amt", "Net sales")], heat.byDay, { totals: true }),
      tableSection("Best sellers running low", [col("name", "Product"), col("status", "Stock"), countCol("qty", "Sold"), moneyCol("amount", "Net sales")],
        stockWatch.map(s => ({ name: s.name, status: s.product?.stockStatus === "OUT_OF_STOCK" ? "Out of stock" : "Low stock", qty: Math.round(s.qty * 100) / 100, amount: s.amount })), { emptyText: "No best seller is running low." }),
      tableSection("Top suppliers", [col("label", "Supplier"), moneyCol("value", "Purchases"), col("meta", "Bills")], supplierRows, { totals: true }),
      tableSection("Product sales", [
        col("name", "Product"), col("sku", "SKU"), col("category", "Category"), col("qty", "Qty sold", "number", { total: "sum" }), moneyCol("amount", "Net sales"),
        col("share", "Share", "percent", { total: "sum" }), countCol("invoices", "Sales"), moneyCol("before", "Before"),
      ], productRows.map(r => {
        const prod = r.id ? productById.get(r.id) : undefined;
        return { name: r.name, sku: prod?.sku ?? "", category: prod?.categoryName ?? "", qty: Math.round(r.qty * 100) / 100, amount: r.amount,
          share: itemsTotal > 0 ? Math.round((r.amount / itemsTotal) * 1000) / 10 : 0, invoices: r.invoices, before: prevProducts.get(r.key)?.amount ?? 0 };
      }), { totals: true, sheetName: "Products" }),
      ...(insights.length ? [tableSection("Insights", [col("title", "Insight"), col("detail", "Detail", "text", { wrap: true })], insights)] : []),
    ],
  });

  if (loading && !invoices.length) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading sales analytics…</div></div>;
  }

  const noCompare = (v: number) => (!v ? "nothing to compare" : undefined);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Sales Analytics</h1>
          <div className={styles.subtitle}>{range.label} · {fmtDate(range.from)} – {fmtDate(range.to)} · changes {range.vs}</div>
        </div>
        <div className={styles.actions}>
          <Seg value={period} onChange={setPeriod} label="Period" options={PERIOD_OPTIONS} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <ReportActions report={buildReport} disabled={loading} menuLabel={`Sales analytics · ${range.label}`} />
          <Button size="sm" onClick={() => navigate("/sales-reports")}><FileText className="h-4 w-4 mr-2" />Reports</Button>
        </div>
      </div>

      {failed.length > 0 && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--destructive)" }}>
          <AlertTriangle size={16} />Couldn't load {failed.join(", ")}. The rest of the page is up to date.
        </div>
      )}

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={styles.kpis}>
          <Kpi icon={ShoppingCart} tone="blue" label="Net sales" value={money(t.sales)} delta={<Delta pct={pctChange(t.sales, p.sales)} />}
            hint={noCompare(p.sales) ?? `incl. ${money(t.tax)} tax`} title="Confirmed POS sales and sales invoices, net of returns, including tax" />
          <Kpi icon={TrendingUp} tone={t.profit < 0 ? "red" : "green"} label="Gross profit" value={money(t.profit)}
            delta={<Delta pct={pctChange(t.profit, p.profit)} />} hint={margin != null ? `${margin.toFixed(1)}% margin` : noCompare(p.profit)}
            title="Sales before tax minus the cost of the goods sold" />
          <Kpi icon={ShoppingBag} tone="teal" label="Sales" value={fmtInt(t.count)} delta={<Delta pct={pctChange(t.count, p.count)} />}
            hint={noCompare(p.count) ?? `${(t.count / Math.max(1, days)).toFixed(1)} a day`} />
          <Kpi icon={CreditCard} tone="violet" label="Average sale" value={money(t.avg)} delta={<Delta pct={pctChange(t.avg, p.avg)} />}
            hint={noCompare(p.avg) ?? `${t.count ? (t.items / t.count).toFixed(1) : "0"} items per sale`} />
          <Kpi icon={Package} tone="orange" label="Items sold" value={fmtInt(t.items)} delta={<Delta pct={pctChange(t.items, p.items)} />}
            hint={noCompare(p.items) ?? `${fmtInt(productRows.length)} different products`} />
          <Kpi icon={RotateCcw} tone={returnRate > 5 ? "red" : "amber"} label="Returns" value={money(t.returned)}
            delta={t.returned > 0 ? <Delta pct={pctChange(t.returned, p.returned)} upIsGood={false} /> : undefined} hint={t.returned ? `${returnRate.toFixed(1)}% of sales` : "no returns"} />
        </div>

        {insights.length > 0 && (
          <Panel title="What stands out" icon={Lightbulb} scope={range.label} sub="Worked out from this period's sales, stock and purchases">
            <div className={styles.insightGrid}>
              {insights.map(i => (
                <div key={i.tag + i.title} className={styles.insight} data-type={i.type}>
                  <span className={styles.insightIcon}><i.icon size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.insightTag}>{i.tag}</div>
                    <div className={styles.insightTitle}>{i.title}</div>
                    <div className={styles.insightDetail}>{i.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className={styles.row2}>
          <Panel title="Sales over time" icon={BarChart3} scope={range.label}
            sub={`Net sales per ${trend.unit} with gross profit${bestBucket && bestBucket.sales > 0 ? ` · best ${trend.unit}: ${bestBucket.tipLabel} (${money(bestBucket.sales)})` : ""}`}>
            {trend.rows.every(r => !r.sales) ? (
              <Empty icon={BarChart3} title="No sales in this period" text="POS sales and confirmed sales invoices show here." />
            ) : (
              <>
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <ComposedChart data={trend.rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} interval="preserveStartEnd" minTickGap={14} />
                      <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={64} tickFormatter={v => compact(Number(v))} />
                      <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey="sales" name="Net sales" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={34} />
                      <Line isAnimationActive={false} dataKey="profit" name="Gross profit" stroke={palette.s3} strokeWidth={2} dot={trend.rows.length <= 16 ? { r: 3 } : false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: "Net sales", color: palette.s1 }, { label: "Gross profit", color: palette.s3, line: true }]} />
              </>
            )}
          </Panel>

          <Panel title="How customers paid" icon={CreditCard} scope={range.label} sub="Payments recorded on this period's sales">
            {payments.total <= 0 ? <div className={styles.empty}>No payments recorded in this period.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className={rs.donutChart}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie isAnimationActive={false} data={payments.rows} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                        {payments.rows.map(r => <Cell key={r.name} fill={r.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={rs.donutCenter}>
                    <div><div className={rs.donutTotal}>{compact(payments.total)}</div><div className={rs.donutLabel}>collected</div></div>
                  </div>
                </div>
                <div className={rs.legendRows}>
                  {payments.rows.map(r => (
                    <div key={r.name} className={rs.legendRow}>
                      <span className={styles.swatch} style={{ ["--sw" as any]: r.color }} />
                      <span className={rs.legendName}>{r.name}</span>
                      <span className={rs.legendAmt}>{money(r.amount)}</span>
                      <span className={rs.legendPct}>{r.pct}%</span>
                    </div>
                  ))}
                </div>
                <div className={styles.facts} style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                  <div className={styles.fact}><span className={styles.factLabel}>Point of Sale</span><span className={styles.factValue}>{money(pos.sales)}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>Sales invoices</span><span className={styles.factValue}>{money(manual.sales)}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>Members</span><span className={styles.factValue}>{money(memberSales)}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>Walk-in</span><span className={styles.factValue}>{money(walkInSales)}</span></div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <div>
              <h3 className={styles.panelTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone="teal"><Clock size={14} /></span>
                When sales happen<span className={styles.scope}>{range.label}</span>
              </h3>
              <div className={styles.panelSub}>Number of sales by weekday and hour, from the time each sale was recorded · {fmtInt(heat.total)} sales</div>
            </div>
          </div>
          {heat.total === 0 ? <div className={styles.empty}><Clock size={22} />No sales in this period.</div> : (
            <>
              <div className={styles.heatWrap}>
                <div className={styles.heat} style={{ ["--cols" as any]: heat.hours.length }} onMouseLeave={() => setHeatHover(null)}
                  role="img" aria-label={`Sales heatmap. Busiest slot ${WEEKDAYS[heat.peak.di]} ${hh(heat.peak.h)} with ${heat.peak.v} sales.`}>
                  <span />
                  {heat.hours.map(h => <span key={h} className={styles.heatHour}>{h % 2 === 0 ? String(h).padStart(2, "0") : ""}</span>)}
                  {WEEKDAYS.map((d, di) => (
                    <React.Fragment key={d}>
                      <span className={styles.heatLabel}>{d}</span>
                      {heat.hours.map(h => {
                        const v = heat.grid[di][h];
                        const text = `${d} ${hh(h)} — ${v} sale${v === 1 ? "" : "s"}${v ? `, ${money(heat.amt[di][h])}` : ""}`;
                        return <span key={h} className={styles.heatCell} title={text} style={{ ["--cell" as any]: heatColor(v) }} onMouseEnter={() => setHeatHover(text)} />;
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className={styles.panelHead} style={{ alignItems: "center" }}>
                <div className={styles.heatReadout} aria-live="polite">
                  {heatHover ?? <>Busiest: <b>{WEEKDAYS[heat.peak.di]} {hh(heat.peak.h)}</b> · busiest day <b>{busiestDay?.day}</b> ({money(busiestDay?.amt ?? 0)}) · peak hour <b>{hh(peakHour?.h ?? 0)}</b></>}
                </div>
                <div className={styles.heatScale}>
                  <span>Fewer</span>
                  <span className={styles.heatRamp}><span style={{ ["--cell" as any]: "var(--heat-0)" }} />{heatRamp.map(c => <span key={c} style={{ ["--cell" as any]: c }} />)}</span>
                  <span>More (max {heat.max})</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.cols2}>
          <Panel title="Best sellers" icon={Package} scope={range.label} sub="Products by net sales value">
            <BarRows rows={bestSellerRows} fmt={money} empty="No products sold in this period." />
          </Panel>
          <Panel title="Sales by category" icon={Layers} scope={range.label} sub="Item sales grouped by product category">
            <BarRows rows={categoryRows} fmt={money} empty="No products sold in this period." />
          </Panel>
        </div>

        <div className={styles.cols2}>
          <Panel title="Product movers" icon={TrendingUp} sub={`Biggest changes in product sales ${range.vs}`}>
            {!movers.up.length && !movers.down.length ? <div className={styles.empty}>Nothing to compare yet.</div> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Product</th><th className={styles.num}>Before</th><th className={styles.num}>Now</th><th className={styles.num}>Change</th></tr></thead>
                  <tbody>
                    {[...movers.up, ...movers.down].map(r => (
                      <tr key={r.key}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td className={`${styles.num} ${styles.muted}`}>{money(r.before)}</td>
                        <td className={styles.num}>{money(r.now)}</td>
                        <td className={styles.num}>
                          {r.before > 0 ? <Delta pct={pctChange(r.now, r.before)} /> : <Status kind="info">new</Status>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title="Top customers" icon={Users} scope={range.label} sub="Named customers and members by spend (walk-ins excluded)">
            <BarRows rows={customerRows} fmt={money} empty="No named customers bought in this period." />
          </Panel>
        </div>

        <div className={styles.cols2}>
          <Panel title="Stock watch" icon={Boxes} sub="Best sellers that are low or out of stock"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/products")}>Products</Button>}>
            {stockWatch.length === 0 ? (
              <Empty icon={Boxes} title="Best sellers are in stock" text="Products you sell most that drop to low or out of stock show here." />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Product</th><th className={styles.num}>Sold / day</th><th className={styles.num}>In stock</th><th>Status</th></tr></thead>
                  <tbody>
                    {stockWatch.map(r => {
                      const perDay = r.qty / Math.max(1, days);
                      const left = Number(r.product?.totalStock) || 0;
                      return (
                        <tr key={r.key}>
                          <td style={{ fontWeight: 600 }}>{r.name}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{r.product?.sku}</div></td>
                          <td className={styles.num}>{perDay.toFixed(1)}</td>
                          <td className={styles.num}>{fmtInt(left)}{perDay > 0 && left > 0 && <div className={styles.muted} style={{ fontSize: "var(--text-xs)" }}>~{Math.max(1, Math.floor(left / perDay))} days</div>}</td>
                          <td>{r.product?.stockStatus === "OUT_OF_STOCK" ? <Status kind="critical">out of stock</Status> : <Status kind="warning">low</Status>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title="Buying" icon={Truck} scope={range.label} sub="Confirmed supplier bills in this period"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/purchase")}>Purchases</Button>}>
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Purchases</span><span className={styles.factValue}>{money(bought)} <Delta pct={pctChange(bought, boughtPrev)} upIsGood={false} /></span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Cost of goods sold</span><span className={styles.factValue}>{money(t.cost)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Bought vs sold (cost)</span><span className={styles.factValue}>{t.cost > 0 ? `${(bought / t.cost).toFixed(2)}×` : "—"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Supplier bills</span><span className={styles.factValue}>{fmtInt(curBills.length)}</span></div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <BarRows rows={supplierRows} fmt={money} empty="No supplier bills in this period." />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
