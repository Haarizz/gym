import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, BarChart3, Boxes, ClipboardList, Package, Receipt, RefreshCw, ShoppingBag, ShoppingCart, Store, TrendingUp, Truck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import { salesInvoiceService, SalesInvoice } from "../utils/supabase/sales-invoice-service";
import { purchaseService, PurchaseOrder } from "../utils/supabase/purchase-service";
import { supplierBillService, SupplierBill } from "../utils/supabase/supplier-bill-service";
import { productsService, ProductStats } from "../utils/supabase/products-service";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, SectionTabs, Seg, Status, Delta,
  pctChange, fmtInt, fmtDate, Period, periodRange, PERIOD_OPTIONS,
} from "../components/overview/overview-kit";
import { ReportActions, type ReportDocument, changeHint, chartFromRows, col, countCol, kpiSection, moneyCol, tableSection } from "../components/report-export";

type Tab = "sales" | "bills" | "orders";

const OPEN_PO = new Set(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"]);
const monthKey = (iso?: string) => (iso || "").slice(0, 7);
const inRange = (iso: string | undefined, from: string, to: string) => !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;

/** Share of the invoice that wasn't returned (returns don't reduce the invoice's own cost/tax figures). */
const keptShare = (inv: SalesInvoice) => {
  const total = Number(inv.totalAmount) || 0;
  return total > 0 ? Math.max(0, 1 - (Number(inv.returnedAmount) || 0) / total) : 1;
};
/** What the customer paid for, net of returns (incl. tax) — the figure on Sales Invoices. */
const netSale = (inv: SalesInvoice) => (Number(inv.totalAmount) || 0) - (Number(inv.returnedAmount) || 0);
/** Sales before tax and the cost of the goods kept, both net of returns. */
const exTax = (inv: SalesInvoice) => (Number(inv.taxableAmount) || 0) * keptShare(inv);
const cogs = (inv: SalesInvoice) => (Number(inv.totalCogs) || 0) * keptShare(inv);

function sum(invs: SalesInvoice[]) {
  let sales = 0, revenue = 0, cost = 0;
  for (const i of invs) { sales += netSale(i); revenue += exTax(i); cost += cogs(i); }
  return { sales, revenue, cost, profit: revenue - cost, count: invs.length, avg: invs.length ? sales / invs.length : 0 };
}

async function allBills(): Promise<SupplierBill[]> {
  const out: SupplierBill[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await supplierBillService.getBills({ page, size: 500 });
    out.push(...r.bills);
    if (r.bills.length < 500 || page >= (r.pagination.totalPages || 1)) break;
  }
  return out;
}

/**
 * Sales & Purchases overview. Sales = confirmed sales invoices (back-office invoices plus the
 * invoice every POS sale creates), net of returns. Purchases = confirmed supplier bills — what was
 * actually bought — rather than purchase orders, which may never arrive.
 */
export function SalesPurchases() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const { formatCurrency } = useCurrency();
  const palette = usePalette();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const [period, setPeriod] = useState<Period>("mtd");
  const [tab, setTab] = useState<Tab>("sales");
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stock, setStock] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    const [i, b, o, s] = await Promise.allSettled([
      salesInvoiceService.getAllInvoices({ status: "CONFIRMED" }),
      allBills(),
      purchaseService.getOrders({ size: 500 }),
      productsService.getStats(),
    ]);
    const errors: string[] = [];
    if (i.status === "fulfilled") setInvoices(i.value); else errors.push("sales invoices");
    if (b.status === "fulfilled") setBills(b.value.filter(x => x.status === "CONFIRMED")); else errors.push("supplier bills");
    if (o.status === "fulfilled") setOrders(o.value.orders ?? []); else errors.push("purchase orders");
    setStock(s.status === "fulfilled" ? s.value : null);
    setFailed(errors);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);
  useEffect(() => { load(); }, [load]);

  const cur = useMemo(() => sum(invoices.filter(i => inRange(i.invoiceDate, range.from, range.to))), [invoices, range]);
  const prev = useMemo(() => sum(invoices.filter(i => inRange(i.invoiceDate, range.compareFrom, range.compareTo))), [invoices, range]);
  const curInvoices = useMemo(() => invoices.filter(i => inRange(i.invoiceDate, range.from, range.to)), [invoices, range]);
  const purchases = (from: string, to: string) => bills.filter(b => inRange(b.billDate, from, to)).reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
  const curBought = useMemo(() => purchases(range.from, range.to), [bills, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevBought = useMemo(() => purchases(range.compareFrom, range.compareTo), [bills, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const unpaidBills = useMemo(() => bills
    .map(b => ({ ...b, due: Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.amountPaid) || 0)) }))
    .filter(b => b.due > 0.005)
    .sort((a, b) => (a.dueDate || a.billDate).localeCompare(b.dueDate || b.billDate)), [bills]);
  const owedToSuppliers = unpaidBills.reduce((s, b) => s + b.due, 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueBills = unpaidBills.filter(b => b.dueDate && b.dueDate < today);
  const customerDue = invoices.reduce((s, i) => s + Math.max(0, netSale(i) - (Number(i.amountPaid) || 0)), 0);

  // Last 6 months, by invoice / bill date
  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + idx, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const t = sum(invoices.filter(i => monthKey(i.invoiceDate) === key));
      const bought = bills.filter(b => monthKey(b.billDate) === key).reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }), tipLabel: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) + (idx === 5 ? " (so far)" : ""),
        sales: Math.round(t.sales), purchases: Math.round(bought), profit: Math.round(t.profit),
      };
    });
  }, [invoices, bills]);

  const channelRows = useMemo(() => {
    const pos = sum(curInvoices.filter(i => i.source === "POS"));
    const manual = sum(curInvoices.filter(i => i.source !== "POS"));
    return [
      { key: "pos", label: "Point of Sale", value: pos.sales, color: palette.s1, meta: `${pos.count} sale${pos.count === 1 ? "" : "s"}` },
      { key: "inv", label: "Sales invoices", value: manual.sales, color: palette.s4, meta: `${manual.count} invoice${manual.count === 1 ? "" : "s"}` },
    ].filter(r => r.value > 0);
  }, [curInvoices, palette]);

  const productRows = useMemo(() => {
    const by = new Map<string, { qty: number; amount: number }>();
    for (const inv of curInvoices) {
      const kept = keptShare(inv);
      for (const it of inv.items ?? []) {
        const k = it.productName || "Item";
        const v = by.get(k) ?? { qty: 0, amount: 0 };
        v.qty += Number(it.quantity) || 0;
        v.amount += (Number(it.totalAmount) || 0) * kept;
        by.set(k, v);
      }
    }
    return [...by.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 6)
      .map(([name, v]) => ({ key: name, label: name, value: v.amount, color: palette.s1, meta: `${fmtInt(v.qty)} sold` }));
  }, [curInvoices, palette]);
  const itemsSold = curInvoices.reduce((s, inv) => s + (inv.items ?? []).reduce((q, it) => q + (Number(it.quantity) || 0), 0), 0);

  const supplierRows = useMemo(() => {
    const by = new Map<string, { amount: number; count: number }>();
    for (const b of bills.filter(x => inRange(x.billDate, range.from, range.to))) {
      const v = by.get(b.supplierName || "Supplier") ?? { amount: 0, count: 0 };
      v.amount += Number(b.totalAmount) || 0; v.count++;
      by.set(b.supplierName || "Supplier", v);
    }
    return [...by.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 6)
      .map(([name, v]) => ({ key: name, label: name, value: v.amount, color: palette.s2, meta: `${v.count} bill${v.count === 1 ? "" : "s"}` }));
  }, [bills, range, palette]);

  const recentSales = useMemo(() => [...invoices]
    .sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 15), [invoices]);
  const openOrders = useMemo(() => orders.filter(o => OPEN_PO.has(o.status))
    .sort((a, b) => (a.expectedDeliveryDate || a.orderDate || "").localeCompare(b.expectedDeliveryDate || b.orderDate || "")), [orders]);

  const tabs: { id: Tab; label: string; icon: typeof Receipt; count?: number }[] = [
    { id: "sales", label: "Recent sales", icon: ShoppingBag },
    { id: "bills", label: "Bills to pay", icon: Receipt, count: unpaidBills.length },
    { id: "orders", label: "Open purchase orders", icon: ClipboardList, count: openOrders.length },
  ];
  const margin = cur.revenue ? Math.round((cur.profit / cur.revenue) * 1000) / 10 : null;
  const noCompare = (p: number) => (!p ? "nothing to compare" : undefined);

  // Export / print: the overview's figures and every tab's list
  const buildReport = (): ReportDocument => ({
    title: "Sales & Purchases Overview",
    period: { from: range.from, to: range.to, label: range.label },
    filters: [{ label: "Compared with", value: `${fmtDate(range.compareFrom)} – ${fmtDate(range.compareTo)}` }],
    sections: [
      kpiSection([
        { label: "Sales", value: cur.sales, format: "money", ...changeHint(pctChange(cur.sales, prev.sales)) },
        { label: "Gross profit", value: cur.profit, format: "money", ...changeHint(pctChange(cur.profit, prev.profit)) },
        { label: "Gross margin", value: margin ?? "—", format: "percent" },
        { label: "Average sale", value: cur.avg, format: "money", hint: `${fmtInt(itemsSold)} items sold` },
        { label: "Purchases", value: curBought, format: "money", ...changeHint(pctChange(curBought, prevBought)) },
        { label: "Owed to suppliers", value: owedToSuppliers, format: "money", hint: `${unpaidBills.length} bills · ${overdueBills.length} overdue` },
        { label: "Customers owe", value: customerDue, format: "money" },
        { label: "Stock alerts", value: stock ? stock.lowStockItems + stock.outOfStockItems : "—", format: "integer", hint: stock ? `${stock.outOfStockItems} out · ${stock.lowStockItems} low` : "unavailable" },
      ], "Key figures"),
      chartFromRows("Sales, purchases and profit (last 6 months)", "bar", monthly, "tipLabel", [
        { key: "sales", name: "Sales", color: "#2a78d6" }, { key: "purchases", name: "Purchases", color: "#eb6834" }, { key: "profit", name: "Gross profit", color: "#1baf7a" },
      ], { valueFormat: "money" }),
      tableSection("By month", [col("tipLabel", "Month"), moneyCol("sales", "Sales"), moneyCol("purchases", "Purchases"), moneyCol("profit", "Gross profit")], monthly, { totals: true }),
      tableSection("Sales by channel", [col("label", "Channel"), moneyCol("value", "Sales"), col("meta", "Count")], channelRows, { totals: true }),
      tableSection("Top products", [col("label", "Product"), moneyCol("value", "Sales"), col("meta", "Quantity")], productRows, { totals: true }),
      tableSection("Top suppliers", [col("label", "Supplier"), moneyCol("value", "Purchases"), col("meta", "Bills")], supplierRows, { totals: true }),
      ...(stock ? [{ kind: "keyValue" as const, title: "Stock", items: [
        { label: "Stock value (cost)", value: stock.totalInventoryValue, format: "money" as const },
        { label: "Low stock items", value: stock.lowStockItems, format: "integer" as const },
        { label: "Out of stock items", value: stock.outOfStockItems, format: "integer" as const },
      ] }] : []),
      tableSection("Recent sales", [col("invoiceDate", "Date", "date"), col("invoiceNumber", "Invoice"), col("customerName", "Customer"), col("source", "Source"), moneyCol("net", "Net sale")],
        recentSales.map(i => ({ invoiceDate: i.invoiceDate, invoiceNumber: i.invoiceNumber, customerName: i.customerName, source: i.source === "POS" ? "POS" : "Invoice", net: netSale(i) })), { totals: true }),
      tableSection("Bills to pay", [col("billDate", "Bill date", "date"), col("billNumber", "Bill"), col("supplierName", "Supplier"), col("dueDate", "Due date", "date"), moneyCol("totalAmount", "Total"), moneyCol("due", "Due")],
        unpaidBills.map(b => ({ billDate: b.billDate, billNumber: b.billNumber, supplierName: b.supplierName, dueDate: b.dueDate ?? "", totalAmount: Number(b.totalAmount) || 0, due: b.due })), { totals: true, emptyText: "All bills paid." }),
      tableSection("Open purchase orders", [col("orderDate", "Order date", "date"), col("poNumber", "PO"), col("supplierName", "Supplier"), col("expected", "Expected", "date"), col("status", "Status"), moneyCol("totalAmount", "Amount")],
        openOrders.map(o => ({ orderDate: o.orderDate, poNumber: o.poNumber, supplierName: o.supplierName, expected: o.expectedDeliveryDate ?? "", status: o.status.replace(/_/g, " "), totalAmount: Number(o.totalAmount) || 0 })), { totals: true, emptyText: "No open purchase orders." }),
    ],
  });

  if (loading && !invoices.length && !bills.length) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading sales & purchases…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Sales & Purchases</h1>
          <div className={styles.subtitle}>{range.label} · {fmtDate(range.from)} – {fmtDate(range.to)} · changes {range.vs}</div>
        </div>
        <div className={styles.actions}>
          <Seg value={period} onChange={setPeriod} label="Period" options={PERIOD_OPTIONS} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <ReportActions report={buildReport} disabled={loading} menuLabel={`Sales & purchases · ${range.label}`} />
          <Button size="sm" onClick={() => navigate("/point-of-sale")}><Store className="h-4 w-4 mr-2" />Open POS</Button>
        </div>
      </div>

      {failed.length > 0 && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--destructive)" }}>
          <AlertTriangle size={16} />Couldn't load {failed.join(", ")}. The rest of the page is up to date.
        </div>
      )}

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={styles.kpis}>
          <Kpi icon={ShoppingCart} tone="blue" label="Sales" value={money(cur.sales)} delta={<Delta pct={pctChange(cur.sales, prev.sales)} />}
            hint={noCompare(prev.sales) ?? `${fmtInt(cur.count)} sale${cur.count === 1 ? "" : "s"}`} onClick={() => navigate("/sales-invoice")}
            title="Confirmed POS sales and sales invoices, net of returns, including tax" />
          <Kpi icon={TrendingUp} tone={cur.profit < 0 ? "red" : "green"} label="Gross profit" value={money(cur.profit)}
            delta={<Delta pct={pctChange(cur.profit, prev.profit)} />} hint={margin != null ? `${margin}% margin` : noCompare(prev.profit)}
            title="Sales before tax minus the cost of the goods sold" />
          <Kpi icon={ShoppingBag} tone="teal" label="Average sale" value={money(cur.avg)} delta={<Delta pct={pctChange(cur.avg, prev.avg)} />}
            hint={noCompare(prev.avg) ?? `${fmtInt(itemsSold)} items sold`} />
          <Kpi icon={Truck} tone="orange" label="Purchases" value={money(curBought)} delta={<Delta pct={pctChange(curBought, prevBought)} upIsGood={false} />}
            hint={noCompare(prevBought) ?? "confirmed supplier bills"} onClick={() => navigate("/purchase")} />
          <Kpi icon={Receipt} tone={overdueBills.length ? "red" : "violet"} label="Owed to suppliers" value={money(owedToSuppliers)}
            hint={unpaidBills.length ? `${unpaidBills.length} bill${unpaidBills.length === 1 ? "" : "s"}${overdueBills.length ? ` · ${overdueBills.length} overdue` : ""}` : "all bills paid"}
            onClick={() => setTab("bills")} />
          <Kpi icon={Boxes} tone={stock && (stock.lowStockItems || stock.outOfStockItems) ? "amber" : "green"} label="Stock alerts"
            value={stock ? fmtInt(stock.lowStockItems + stock.outOfStockItems) : "—"}
            hint={stock ? `${stock.outOfStockItems} out · ${stock.lowStockItems} low · ${money(stock.totalInventoryValue)} stock` : "unavailable"}
            onClick={() => navigate("/products")} />
        </div>

        <div className={styles.row2}>
          <Panel title="Sales vs purchases" icon={BarChart3} scope="Last 6 months" sub="Sales and supplier bills per month, with gross profit">
            {monthly.every(m => !m.sales && !m.purchases) ? (
              <Empty icon={BarChart3} title="No sales or purchases yet" text="POS sales, sales invoices and supplier bills show here." />
            ) : (
              <>
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <ComposedChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={64} tickFormatter={v => compact(Number(v))} />
                      <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey="sales" name="Sales" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar isAnimationActive={false} dataKey="purchases" name="Purchases" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line isAnimationActive={false} dataKey="profit" name="Gross profit" stroke={palette.s3} strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: "Sales", color: palette.s1 }, { label: "Purchases", color: palette.s2 }, { label: "Gross profit", color: palette.s3, line: true }]} />
              </>
            )}
          </Panel>

          <Panel title="Where sales came from" icon={Store} scope={range.label}>
            <BarRows rows={channelRows} fmt={money} empty="No sales in this period." />
            <div className={styles.facts} style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div className={styles.fact}><span className={styles.factLabel}>Sales before tax</span><span className={styles.factValue}>{money(cur.revenue)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Cost of goods sold</span><span className={styles.factValue}>{money(cur.cost)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Customers owe</span><span className={styles.factValue}>{money(customerDue)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Stock value (cost)</span><span className={styles.factValue}>{stock ? money(stock.totalInventoryValue) : "—"}</span></div>
            </div>
          </Panel>
        </div>

        <div className={styles.cols2}>
          <Panel title="Best sellers" icon={Package} scope={range.label} sub="Products by sales value, net of returns">
            <BarRows rows={productRows} fmt={money} empty="No products sold in this period." />
          </Panel>
          <Panel title="Top suppliers" icon={Truck} scope={range.label} sub="Confirmed bills by supplier">
            <BarRows rows={supplierRows} fmt={money} empty="No supplier bills in this period." />
          </Panel>
        </div>

        <SectionTabs tabs={tabs} value={tab} onChange={setTab} label="Sales and purchase details" />

        {tab === "sales" && (
          <Panel title="Latest sales" icon={ShoppingBag} sub="Most recent confirmed POS sales and invoices"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/sales-invoice")}>Sales Invoices</Button>}>
            {recentSales.length === 0 ? <Empty icon={ShoppingBag} title="No sales yet" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th className={styles.num}>Amount</th></tr></thead>
                  <tbody>
                    {recentSales.map(inv => {
                      const first = inv.items?.[0]?.productName;
                      const due = Math.max(0, netSale(inv) - (Number(inv.amountPaid) || 0));
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{inv.source === "POS" ? "Point of Sale" : "Invoice"}</div></td>
                          <td>{fmtDate(inv.invoiceDate)}</td>
                          <td className={styles.muted}>{inv.customerName || "Walk-in"}</td>
                          <td className={styles.muted}>{first ? (inv.items.length > 1 ? `${first} +${inv.items.length - 1} more` : first) : "—"}</td>
                          <td>
                            {Number(inv.returnedAmount) > 0 ? <Status kind="info">returned {money(Number(inv.returnedAmount))}</Status>
                              : due > 0.005 ? <Status kind="warning">{inv.paymentStatus === "PARTIAL" ? "part paid" : "unpaid"}</Status>
                              : <Status kind="good">paid</Status>}
                          </td>
                          <td className={styles.num} style={{ fontWeight: 700 }}>{money(netSale(inv))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "bills" && (
          <Panel title="Supplier bills to pay" icon={Receipt} sub="Confirmed bills with a balance, oldest due first"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/purchase")}>Purchases</Button>}>
            {unpaidBills.length === 0 ? <Empty icon={Receipt} title="All supplier bills are paid" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Bill</th><th>Supplier</th><th>Billed</th><th>Due</th><th className={styles.num}>Total</th><th className={styles.num}>Balance</th></tr></thead>
                  <tbody>
                    {unpaidBills.map(b => {
                      const overdue = !!b.dueDate && b.dueDate < today;
                      return (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.billNumber}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{b.invoiceNumber || ""}</div></td>
                          <td>{b.supplierName}</td>
                          <td>{fmtDate(b.billDate)}</td>
                          <td>{b.dueDate ? <Status kind={overdue ? "critical" : "info"}>{overdue ? "overdue · " : ""}{fmtDate(b.dueDate)}</Status> : "—"}</td>
                          <td className={styles.num}>{money(Number(b.totalAmount) || 0)}</td>
                          <td className={styles.num} style={{ fontWeight: 700 }}>{money(b.due)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={5}>Owed to suppliers</td><td className={styles.num}>{money(owedToSuppliers)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "orders" && (
          <Panel title="Open purchase orders" icon={ClipboardList} sub="Not yet fully received, by expected delivery"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/purchase-order")}>Purchase Orders</Button>}>
            {openOrders.length === 0 ? <Empty icon={ClipboardList} title="No open purchase orders" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Order</th><th>Supplier</th><th>Ordered</th><th>Expected</th><th>Status</th><th className={styles.num}>Amount</th></tr></thead>
                  <tbody>
                    {openOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>{o.poNumber}</td>
                        <td>{o.supplierName}</td>
                        <td>{fmtDate(o.orderDate)}</td>
                        <td>{fmtDate(o.expectedDeliveryDate)}</td>
                        <td><Status kind={o.status === "DRAFT" || o.status === "PENDING_APPROVAL" ? "warning" : "info"}>{o.status.replace(/_/g, " ").toLowerCase()}</Status></td>
                        <td className={styles.num} style={{ fontWeight: 700 }}>{money(Number(o.totalAmount) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
