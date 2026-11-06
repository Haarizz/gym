import React from "react";
import { format, parseISO } from "date-fns";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, BadgePercent, Clock, Download, Minus, Receipt, Trophy, UserCheck, Users, Wallet, CalendarDays,
} from "lucide-react";
import { Button } from "../ui/button";
import { CurrencyGlyph } from "../../utils/currency";
import type { RevenueCompareRow, RevenueSummary } from "../../utils/supabase/dashboard-service";
import styles from "./RevenueReports.module.css";
import { ReportActions, type ReportDocument, type ReportSection, chartFromRows, col, countCol, kpiSection, moneyCol, tableSection } from "../report-export";

const CURRENT_COLOR = "var(--gb-primary-deep)";
const COMPARE_COLOR = "#94A3B8";

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v: unknown, digits = 2) =>
  num(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "1 sale" / "3 sales" — units are passed in plural. */
const countLabel = (n: number, unit: string) => `${n.toLocaleString()} ${n === 1 ? unit.replace(/s$/, "") : unit}`;

function Money({ value, digits = 2 }: { value: unknown; digits?: number }) {
  return <span className={styles.money}><CurrencyGlyph />{fmt(value, digits)}</span>;
}

/** "Sep 1 – Sep 30, 2026" */
export function formatRange(from?: string, to?: string) {
  if (!from || !to) return "";
  const f = parseISO(from);
  const t = parseISO(to);
  if (from === to) return format(f, "MMM d, yyyy");
  return f.getFullYear() === t.getFullYear()
    ? `${format(f, "MMM d")} – ${format(t, "MMM d, yyyy")}`
    : `${format(f, "MMM d, yyyy")} – ${format(t, "MMM d, yyyy")}`;
}

/** % change; null when there's nothing to compare against. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** ▲ 12.5% / ▼ 3.0% / "New" — green when the move is good. */
export function ChangeBadge({ current, previous, goodWhenUp = true }: { current: number; previous: number; goodWhenUp?: boolean }) {
  const pct = pctChange(current, previous);
  if (pct === null) return <span className={`${styles.change} ${styles.up}`}>New</span>;
  if (Math.abs(pct) < 0.05) return <span className={`${styles.change} ${styles.flat}`}><Minus size={12} />0%</span>;
  const good = (pct > 0) === goodWhenUp;
  return (
    <span className={`${styles.change} ${good ? styles.up : styles.down}`}>
      {pct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── Second KPI row ───────────────────────────────────────────────────────────

export function RevenueInsightTiles({ data }: { data: RevenueSummary }) {
  const i = data.insights;
  const c = data.comparison;
  const collection = num(data.totalCollection.total);
  const margin = collection > 0 ? (num(data.netRevenue.total) / collection) * 100 : 0;
  const prevCollection = num(c.totalCollection.total);
  const prevMargin = prevCollection > 0 ? (num(c.netRevenue.total) / prevCollection) * 100 : 0;

  const tiles: { label: string; icon: React.ElementType; value: React.ReactNode; sub: React.ReactNode }[] = [
    {
      label: "Transactions", icon: Receipt, value: num(i.transactions).toLocaleString(),
      sub: <><ChangeBadge current={num(i.transactions)} previous={num(c.transactions)} /> vs {num(c.transactions)}</>,
    },
    {
      label: "Avg. Transaction", icon: Wallet, value: <Money value={i.avgTransaction} />,
      sub: <><ChangeBadge current={num(i.avgTransaction)} previous={num(c.avgTransaction)} /> vs <Money value={c.avgTransaction} /></>,
    },
    {
      label: "Paying Members", icon: UserCheck, value: num(i.payingMembers).toLocaleString(),
      sub: <><ChangeBadge current={num(i.payingMembers)} previous={num(c.payingMembers)} /> vs {num(c.payingMembers)}</>,
    },
    {
      label: "Revenue / Active Member", icon: Users, value: <Money value={i.revenuePerMember} />,
      sub: `${num(data.activeMembers.count)} active members`,
    },
    {
      label: "Profit Margin", icon: BadgePercent, value: `${margin.toFixed(1)}%`,
      sub: <>{(margin - prevMargin >= 0 ? "+" : "") + (margin - prevMargin).toFixed(1)} pts vs {prevMargin.toFixed(1)}%</>,
    },
    {
      label: "Discounts Given", icon: BadgePercent, value: <Money value={i.discounts.total} />,
      sub: <><ChangeBadge current={num(i.discounts.total)} previous={num(c.discounts)} goodWhenUp={false} /> on {countLabel(num(i.discounts.count), "sales")}</>,
    },
    {
      label: "Outstanding Dues", icon: Clock, value: <Money value={i.outstanding.total} />,
      sub: `${num(i.outstanding.membershipCount)} member${num(i.outstanding.membershipCount) === 1 ? "" : "s"} + sales invoices · as of today`,
    },
  ];

  return (
    <div className={styles.tiles}>
      {tiles.map((t) => (
        <div key={t.label} className={styles.tile}>
          <div className={styles.tileHead}><t.icon size={14} />{t.label}</div>
          <div className={styles.tileValue}>{t.value}</div>
          <div className={styles.tileSub}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Shared table ────────────────────────────────────────────────────────────

function CompareTable({
  title, description, rows, unit = "txns", ranked = false, goodWhenUp = true, compareLabel, empty,
}: {
  title: string;
  description?: string;
  rows: RevenueCompareRow[];
  unit?: string;
  ranked?: boolean;
  goodWhenUp?: boolean;
  compareLabel: string;
  empty?: string;
}) {
  const total = rows.reduce((s, r) => s + num(r.amount), 0);
  const prevTotal = rows.reduce((s, r) => s + num(r.previousAmount), 0);
  return (
    <section className={styles.panel}>
      <header className={styles.panelHead}>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      {rows.length === 0 ? (
        <p className={styles.empty}>{empty ?? "Nothing recorded in either period."}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {ranked && <th className={styles.rank}>#</th>}
                <th>Name</th>
                <th className={styles.num}>This period</th>
                <th className={styles.num}>{compareLabel}</th>
                <th className={styles.num}>Change</th>
                <th className={styles.shareCol}>Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const diff = num(r.amount) - num(r.previousAmount);
                const share = total > 0 ? (num(r.amount) / total) * 100 : 0;
                return (
                  <tr key={r.name}>
                    {ranked && <td className={styles.rank}>{idx + 1}</td>}
                    <td className={styles.name} title={r.name}>{r.name}</td>
                    <td className={styles.num}>
                      <Money value={r.amount} />
                      <div className={styles.muted}>{countLabel(num(r.count), unit)}</div>
                    </td>
                    <td className={styles.num}>
                      <Money value={r.previousAmount} />
                      <div className={styles.muted}>{countLabel(num(r.previousCount), unit)}</div>
                    </td>
                    <td className={styles.num}>
                      <ChangeBadge current={num(r.amount)} previous={num(r.previousAmount)} goodWhenUp={goodWhenUp} />
                      <div className={styles.muted}>{diff >= 0 ? "+" : "−"}<Money value={Math.abs(diff)} /></div>
                    </td>
                    <td className={styles.shareCol}>
                      <div className={styles.shareBar}><span style={{ width: `${Math.min(100, share)}%` }} /></div>
                      <span className={styles.muted}>{share.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                {ranked && <td />}
                <td>Total{ranked && rows.length >= 10 ? " (top 10)" : ""}</td>
                <td className={styles.num}><Money value={total} /></td>
                <td className={styles.num}><Money value={prevTotal} /></td>
                <td className={styles.num}><ChangeBadge current={total} previous={prevTotal} goodWhenUp={goodWhenUp} /></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

const MoneyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <Money value={p.value} />
        </p>
      ))}
    </div>
  );
};

// ── Comparison tab ──────────────────────────────────────────────────────────

export function RevenueComparisonTab({ data }: { data: RevenueSummary }) {
  const c = data.comparison;
  const i = data.insights;
  const compareLabel = data.compare === "last-year" ? "Last year" : "Previous";
  const glance: { label: string; current: number; previous: number; money?: boolean; goodWhenUp?: boolean }[] = [
    { label: "Total Collection", current: num(data.totalCollection.total), previous: num(c.totalCollection.total), money: true },
    { label: "Cash", current: num(data.totalCollection.cash), previous: num(c.totalCollection.cash), money: true },
    { label: "Card", current: num(data.totalCollection.card), previous: num(c.totalCollection.card), money: true },
    { label: "Online / Other", current: num(data.totalCollection.other), previous: num(c.totalCollection.other), money: true },
    { label: "Expenses", current: num(data.expenses.total), previous: num(c.expenses.total), money: true, goodWhenUp: false },
    { label: "Net Revenue", current: num(data.netRevenue.total), previous: num(c.netRevenue.total), money: true },
    { label: "Transactions", current: num(i.transactions), previous: num(c.transactions) },
    { label: "Avg. Transaction", current: num(i.avgTransaction), previous: num(c.avgTransaction), money: true },
    { label: "Paying Members", current: num(i.payingMembers), previous: num(c.payingMembers) },
    { label: "Discounts Given", current: num(i.discounts.total), previous: num(c.discounts), money: true, goodWhenUp: false },
  ];
  const streamChart = i.streams.map((s) => ({ name: s.name, current: num(s.amount), previous: num(s.previousAmount) }));

  return (
    <div className={styles.stack}>
      <div className={styles.grid2}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Period at a Glance</h3>
            <p>{formatRange(data.from, data.to)} vs {c.label.toLowerCase()} ({formatRange(data.previousFrom, data.previousTo)})</p>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className={styles.num}>This period</th>
                  <th className={styles.num}>{compareLabel}</th>
                  <th className={styles.num}>Difference</th>
                  <th className={styles.num}>Change</th>
                </tr>
              </thead>
              <tbody>
                {glance.map((g) => {
                  const diff = g.current - g.previous;
                  return (
                    <tr key={g.label}>
                      <td className={styles.name}>{g.label}</td>
                      <td className={styles.num}>{g.money ? <Money value={g.current} /> : g.current.toLocaleString()}</td>
                      <td className={styles.num}>{g.money ? <Money value={g.previous} /> : g.previous.toLocaleString()}</td>
                      <td className={styles.num}>
                        {diff >= 0 ? "+" : "−"}{g.money ? <Money value={Math.abs(diff)} /> : Math.abs(diff).toLocaleString()}
                      </td>
                      <td className={styles.num}><ChangeBadge current={g.current} previous={g.previous} goodWhenUp={g.goodWhenUp ?? true} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Revenue Streams Compared</h3>
            <p>This period vs {c.label.toLowerCase()}</p>
          </header>
          {streamChart.length === 0 ? (
            <p className={styles.empty}>No revenue in either period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={streamChart} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} width={60} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name={c.label} fill={COMPARE_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <div className={styles.grid2}>
        <CompareTable title="Revenue Streams" description="Where the money came from" rows={i.streams} compareLabel={compareLabel} />
        <CompareTable title="Payment Methods" description="How members paid" rows={i.paymentMethods} compareLabel={compareLabel} />
        <CompareTable title="Membership Transaction Types" description="New, renewals, add-ons, day passes, settlements"
          rows={i.transactionTypes} unit="receipts" compareLabel={compareLabel} />
        <CompareTable title="Expense Categories" description="Approved and paid expenses" rows={i.expenseCategories}
          unit="items" goodWhenUp={false} compareLabel={compareLabel} empty="No expenses in either period." />
      </div>
    </div>
  );
}

// ── Detailed reports tab ───────────────────────────────────────────────────

export function RevenueReportsTab({ data, currencyCode }: { data: RevenueSummary; currencyCode: string }) {
  const i = data.insights;
  const c = data.comparison;
  const compareLabel = data.compare === "last-year" ? "Last year" : "Previous";
  const weekdayChart = i.weekdays.map((w) => ({ name: w.name, current: num(w.amount), previous: num(w.previousAmount) }));
  const activeHours = i.hours.filter((h) => num(h.amount) > 0);
  const firstHour = activeHours.length ? activeHours[0].hour : 6;
  const lastHour = activeHours.length ? activeHours[activeHours.length - 1].hour : 22;
  const hourChart = i.hours
    .filter((h) => h.hour >= Math.min(firstHour, 6) && h.hour <= Math.max(lastHour, 22))
    .map((h) => ({ name: h.name, current: num(h.amount), txns: num(h.count) }));
  const bestDay = [...i.weekdays].sort((a, b) => num(b.amount) - num(a.amount))[0];
  const peakHour = [...i.hours].sort((a, b) => num(b.amount) - num(a.amount))[0];
  const topPlan = i.topPlans[0];
  const topMember = i.topMembers[0];

  const highlights = [
    { icon: CalendarDays, label: "Best day", value: bestDay && num(bestDay.amount) > 0 ? bestDay.name : "—", sub: bestDay && num(bestDay.amount) > 0 ? <Money value={bestDay.amount} /> : "No sales yet" },
    { icon: Clock, label: "Peak hour", value: peakHour && num(peakHour.amount) > 0 ? peakHour.name : "—", sub: peakHour && num(peakHour.amount) > 0 ? <>{num(peakHour.count)} txns · <Money value={peakHour.amount} /></> : "No sales yet" },
    { icon: Trophy, label: "Top plan", value: topPlan && num(topPlan.amount) > 0 ? topPlan.name : "—", sub: topPlan && num(topPlan.amount) > 0 ? <Money value={topPlan.amount} /> : "No membership sales" },
    { icon: UserCheck, label: "Top member", value: topMember && num(topMember.amount) > 0 ? topMember.name : "—", sub: topMember && num(topMember.amount) > 0 ? <Money value={topMember.amount} /> : "No member payments" },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.reportBar}>
        <p>
          Detailed revenue report for <strong>{formatRange(data.from, data.to)}</strong>, compared with {c.label.toLowerCase()} ({formatRange(data.previousFrom, data.previousTo)}).
        </p>
        <ReportActions report={() => buildRevenueDetailReport(data)} menuLabel="Detailed revenue report" compact />
      </div>

      <div className={styles.highlights}>
        {highlights.map((h) => (
          <div key={h.label} className={styles.highlight}>
            <h.icon size={18} />
            <div>
              <p className={styles.muted}>{h.label}</p>
              <p className={styles.highlightValue} title={typeof h.value === "string" ? h.value : undefined}>{h.value}</p>
              <p className={styles.muted}>{h.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Revenue by Day of Week</h3>
            <p>This period vs {c.label.toLowerCase()}</p>
          </header>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekdayChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={60} />
              <Tooltip content={<MoneyTooltip />} />
              <Legend />
              <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="previous" name={c.label} fill={COMPARE_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Peak Hours</h3>
            <p>When money comes in during the day (sales-invoice payments have no time, so they're left out)</p>
          </header>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} width={60} />
              <Tooltip content={<MoneyTooltip />} />
              <Bar dataKey="current" name="Revenue" fill={CURRENT_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className={styles.grid2}>
        <CompareTable title="Top Plans" description="Membership revenue by plan" rows={i.topPlans} unit="receipts" ranked compareLabel={compareLabel} />
        <CompareTable title="Top POS Products" description="Point-of-sale revenue by product" rows={i.topProducts} unit="sales" ranked compareLabel={compareLabel} empty="No POS sales in either period." />
        <CompareTable title="Top Paying Members" description="Members who paid the most (walk-ins excluded)" rows={i.topMembers} ranked compareLabel={compareLabel} />
        <CompareTable title="Collection by Staff" description="Who took the payment (bookings don't record it)" rows={i.staff} compareLabel={compareLabel} />
      </div>
    </div>
  );
}

// ── CSV export ──────────────────────────────────────────────────────────────

/** The Detailed Reports tab (both periods, every breakdown) as an export / print document. */
export function buildRevenueDetailReport(data: RevenueSummary): ReportDocument {
  const i = data.insights;
  const c = data.comparison;
  const ch = (cur: number, prev: number) => { const p = pctChange(cur, prev); return p === null ? "New" : Math.round(p * 10) / 10; };
  const row = (metric: string, cur: unknown, prev: unknown) => ({ metric, cur: num(cur), prev: num(prev), change: ch(num(cur), num(prev)) });
  const compareTable = (title: string, rows: RevenueCompareRow[], countLabel = "Transactions"): ReportSection => {
    const total = rows.reduce((s, r) => s + num(r.amount), 0);
    return tableSection(title, [
      col("name", "Name"), moneyCol("amount", "This period"), countCol("count", countLabel), moneyCol("previousAmount", c.label), countCol("previousCount", `${c.label} ${countLabel.toLowerCase()}`),
      col("change", "Change", "percent"), col("share", "Share", "percent", { total: "sum" }),
    ], rows.map((r) => ({
      name: r.name, amount: num(r.amount), count: num(r.count), previousAmount: num(r.previousAmount), previousCount: num(r.previousCount),
      change: ch(num(r.amount), num(r.previousAmount)), share: total > 0 ? Math.round((num(r.amount) / total) * 1000) / 10 : 0,
    })), { totals: true, emptyText: "Nothing recorded in this period." });
  };
  return {
    title: "Detailed Revenue Report",
    period: { from: data.from, to: data.to },
    filters: [{ label: "Compared with", value: `${c.label} (${formatRange(data.previousFrom, data.previousTo)})` }],
    orientation: "landscape",
    sections: [
      kpiSection([
        { label: "Total collection", value: num(data.totalCollection.total), format: "money" },
        { label: "Net revenue", value: num(data.netRevenue.total), format: "money" },
        { label: "Transactions", value: num(i.transactions), format: "integer" },
        { label: "Avg. transaction", value: num(i.avgTransaction), format: "money" },
        { label: "Paying members", value: num(i.payingMembers), format: "integer" },
        { label: "Outstanding dues (today)", value: num(i.outstanding.total), format: "money" },
      ], "Headline"),
      tableSection("Summary · amounts", [col("metric", "Metric"), moneyCol("cur", "This period", { total: undefined }), moneyCol("prev", c.label, { total: undefined }), col("change", "Change", "percent")], [
        row("Total collection", data.totalCollection.total, c.totalCollection.total),
        row("Cash", data.totalCollection.cash, c.totalCollection.cash),
        row("Card", data.totalCollection.card, c.totalCollection.card),
        row("Online / other", data.totalCollection.other, c.totalCollection.other),
        row("Expenses", data.expenses.total, c.expenses.total),
        row("Net revenue", data.netRevenue.total, c.netRevenue.total),
        row("Avg. transaction", i.avgTransaction, c.avgTransaction),
        row("Discounts given", i.discounts.total, c.discounts),
      ]),
      tableSection("Summary · counts", [col("metric", "Metric"), col("cur", "This period", "integer"), col("prev", c.label, "integer"), col("change", "Change", "percent")], [
        row("Transactions", i.transactions, c.transactions),
        row("Paying members", i.payingMembers, c.payingMembers),
      ]),
      chartFromRows("Revenue trend", "line", data.trend.map((p, idx) => ({ ...p, prev: num(c.trend[idx]?.revenue) })), "label", [
        { key: (p: { revenue: number }) => num(p.revenue), name: "Revenue", color: "#2a78d6" },
        { key: "prev", name: c.label, color: "#8a8780" },
      ], { valueFormat: "money" }),
      compareTable("Revenue streams", i.streams),
      compareTable("Payment methods", i.paymentMethods),
      compareTable("Membership transaction types", i.transactionTypes),
      compareTable("Expense categories", i.expenseCategories, "Items"),
      compareTable("Top plans", i.topPlans),
      compareTable("Top POS products", i.topProducts, "Lines"),
      compareTable("Top paying members", i.topMembers),
      compareTable("Collection by staff", i.staff),
      compareTable("Revenue by day of week", i.weekdays),
      chartFromRows("Revenue by hour", "bar", i.hours, "name", [{ key: (h: { amount: number }) => num(h.amount), name: "Revenue", color: "#2a78d6" }], { valueFormat: "money" }),
      tableSection("Revenue by hour", [col("name", "Hour"), moneyCol("amount", "Revenue"), countCol("count", "Transactions")], i.hours.map((h) => ({ name: h.name, amount: num(h.amount), count: num(h.count) })), { totals: true }),
      tableSection("Trend", [col("label", "Period"), moneyCol("revenue", "Revenue"), moneyCol("expenses", "Expenses"), moneyCol("prev", `${c.label} revenue`)],
        data.trend.map((p, idx) => ({ label: p.label, revenue: num(p.revenue), expenses: p.expenses === null ? null : num(p.expenses), prev: num(c.trend[idx]?.revenue) })), { totals: true }),
    ],
  };
}
