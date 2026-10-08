import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { Empty, Money } from "./components/Shared";
import { fmtDate, num, todayIso } from "./pricing";
import { exportReportXlsx } from "./print/reportA4";
import type { Analytics } from "./types";
import s from "./pos.module.css";

const TEAL = "#2B7A78";
const shiftDays = (iso: string, d: number) => {
  const x = new Date(`${iso}T00:00:00`);
  x.setDate(x.getDate() + d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export function AnalyticsView() {
  const { go, company, template, currencyCode } = usePos();
  const [to, setTo] = useState(todayIso());
  const [from, setFrom] = useState(shiftDays(todayIso(), -29));
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await posApi.analytics(from, to));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const preset = (days: number) => { const t = todayIso(); setTo(t); setFrom(shiftDays(t, -(days - 1))); };
  const daily = useMemo(() => (data?.daily ?? []).map((d) => ({ ...d, label: fmtDate(d.date).slice(0, 6), net: d.amount - d.returns })), [data]);
  const hourly = useMemo(() => (data?.hourly ?? []).filter((h) => h.hour >= 5 && h.hour <= 23).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, "0")}:00` })), [data]);
  const maxCat = Math.max(1, ...(data?.categories ?? []).map((c) => c.amount));
  const tenderTotal = Math.max(0.01, (data?.summary.tenders ?? []).reduce((a, t) => a + t.amount, 0));

  const exportXlsx = () => {
    if (!data || !company) return;
    exportReportXlsx({
      title: "POS SALES ANALYTICS",
      number: `${data.from} to ${data.to}`,
      meta: [{ label: "From", value: data.from }, { label: "To", value: data.to }],
      sections: [{
        heading: "Summary",
        rows: [
          { label: "Invoices", value: String(data.summary.invoiceCount) },
          { label: "Total sales", value: num(data.summary.totalSales) },
          { label: "Returns", value: num(data.summary.returnTotal) },
          { label: "Net sales", value: num(data.summary.netSales) },
          { label: "VAT", value: num(data.summary.totalTax) },
          { label: "Discounts", value: num(data.summary.totalDiscount) },
          { label: "Average basket", value: num(data.summary.averageBasket) },
        ],
      }],
      footer: null, company, template, barcode: null,
    }, `POS-Analytics-${data.from}-${data.to}.xlsx`, [
      { heading: "Daily", columns: ["Date", "Invoices", "Sales", "Returns"], rows: data.daily.map((d) => [d.date, d.count, d.amount, d.returns]) },
      { heading: "Top products", columns: ["Product", "SKU", "Category", "Qty", "Amount"], rows: data.topItems.map((i) => [i.name, i.sku ?? "", i.category, i.quantity, i.amount]) },
      { heading: "Categories", columns: ["Category", "Qty", "Amount"], rows: data.categories.map((c) => [c.category, c.quantity, c.amount]) },
      { heading: "Cashiers", columns: ["Cashier", "Invoices", "Gross", "Discount", "Returns", "Net"], rows: data.cashiers.map((c) => [c.cashier, c.invoiceCount, c.grossSales, c.discount, c.returns, c.netSales]) },
    ]);
  };

  const sum = data?.summary;
  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <button type="button" className={s.backLink} onClick={() => go("dashboard")}><ArrowLeft size={14} />POS dashboard</button>
          <div className={s.heroTitle}>Sales analytics</div>
          <div className={s.heroSub}>Point-of-sale performance by day, hour, product, category and cashier.</div>
        </div>
        <div className={s.rowWrap}>
          <div className={s.segmented}>
            <button type="button" onClick={() => preset(1)}>Today</button>
            <button type="button" onClick={() => preset(7)}>7 days</button>
            <button type="button" onClick={() => preset(30)}>30 days</button>
            <button type="button" onClick={() => preset(90)}>90 days</button>
          </div>
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
          <Input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!data}><Download className="h-4 w-4 mr-2" />Excel</Button>
        </div>
      </div>

      {sum && (
        <div className={s.stats}>
          {[
            { label: "Net sales", value: <Money value={sum.netSales} />, foot: `Gross ${num(sum.totalSales)} · returns ${num(sum.returnTotal)}` },
            { label: "Invoices", value: String(sum.invoiceCount), foot: `${sum.itemsSold} items sold` },
            { label: "Average basket", value: <Money value={sum.averageBasket} />, foot: "Total ÷ invoices" },
            { label: "VAT", value: <Money value={sum.totalTax} />, foot: `Taxable ${num(sum.taxableAmount)}` },
            { label: "Discounts", value: <Money value={sum.totalDiscount} />, foot: `${sum.discountedInvoiceCount} discounted sale(s)` },
          ].map((c) => (
            <div key={c.label} className={s.stat}>
              <div className={s.statBody}><div className={s.statHead}><span className={s.statLabel}>{c.label}</span></div><div className={s.statValue}>{c.value}</div></div>
              <div className={s.statFoot}>{c.foot}</div>
            </div>
          ))}
        </div>
      )}

      {data && sum && sum.invoiceCount === 0 && <div className={s.panel}><Empty icon={<RefreshCw size={30} />} title="No POS sales in this range" /></div>}

      {data && sum && sum.invoiceCount > 0 && (
        <>
          <div className={s.grid2}>
            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Daily sales</div><div className={s.panelSub}>{currencyCode}</div></div>
              <div className={s.panelBody} style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ left: 0, right: 10, top: 10 }}>
                    <defs><linearGradient id="posArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={TEAL} stopOpacity={0.35} /><stop offset="100%" stopColor={TEAL} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={16} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} width={60} />
                    <Tooltip formatter={(v: number) => num(v)} />
                    <Area type="monotone" dataKey="net" name="Net sales" stroke={TEAL} strokeWidth={2} fill="url(#posArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Busiest hours</div><div className={s.panelSub}>Invoices per hour</div></div>
              <div className={s.panelBody} style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly} margin={{ left: 0, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={36} />
                    <Tooltip />
                    <Bar dataKey="count" name="Invoices" fill={TEAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={s.grid3}>
            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Payment mix</div></div>
              <div className={s.panelBody}>
                {sum.tenders.map((t) => (
                  <div key={t.method} style={{ marginBottom: 12 }}>
                    <div className={s.rowBetween} style={{ fontSize: 13, marginBottom: 4 }}><span>{t.method} <span className={s.muted}>({t.count})</span></span><span className={s.strong}><Money value={t.amount} /></span></div>
                    <div className={s.barTrack}><div className={s.barFill} style={{ width: `${Math.min(100, (t.amount / tenderTotal) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Categories</div></div>
              <div className={s.panelBody}>
                {data.categories.map((c) => (
                  <div key={c.category} style={{ marginBottom: 12 }}>
                    <div className={s.rowBetween} style={{ fontSize: 13, marginBottom: 4 }}><span>{c.category} <span className={s.muted}>({c.quantity})</span></span><span className={s.strong}><Money value={c.amount} /></span></div>
                    <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(c.amount / maxCat) * 100}%`, background: "#17a2b8" }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Cashiers</div></div>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Cashier</th><th className={s.num}>Sales</th><th className={s.num}>Net</th></tr></thead>
                  <tbody>{data.cashiers.map((c) => <tr key={c.cashier}><td>{c.cashier}</td><td className={s.num}>{c.invoiceCount}</td><td className={s.num}><Money value={c.netSales} /></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Top products</div></div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Category</th><th className={s.num}>Qty</th><th className={s.num}>Sales</th></tr></thead>
                <tbody>{data.topItems.map((i, idx) => (
                  <tr key={`${i.productId}-${idx}`}><td className={s.muted}>{idx + 1}</td><td className={s.strong}>{i.name}</td><td>{i.sku || "—"}</td><td>{i.category}</td><td className={s.num}>{i.quantity}</td><td className={s.num}><Money value={i.amount} /></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
