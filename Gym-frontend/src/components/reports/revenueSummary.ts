import { format, isValid, parseISO } from "date-fns";
import {
  type Block, type Cell, type DayReportData, type Row, hourLabel, money, num, pendingExpenses, spentExpenses, sum,
} from "./dayReportBlocks";

/**
 * Day Report › Summary: total revenue (money collected) minus the expenses deducted from it
 * (approved and paid), as a profit-and-loss statement. Built once from the Day Report data and
 * shared by the Summary view, its print, the plain-text copy/download and the Excel export, so
 * every format shows exactly the same figures.
 *
 * Revenue = the Revenue Dashboard's Total Collection for the same dates (member receipts, POS
 * sales paid at the till, POS credit settlements, sales-invoice payments, paid bookings).
 */

export interface SummaryLine {
  name: string;
  amount: number;
  count: number;
  /** Comparison period (previous day / period); null when the server didn't send it */
  previous: number | null;
}

export interface SummaryDay {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
  net: number;
  cumulative: number;
  /** The comparison period's running net on the same day number (aligned by index) */
  previousCumulative: number | null;
  margin: number | null;
}

export interface SummaryHour {
  hour: number;
  label: string;
  revenue: number;
  cumulative: number;
  /** Cumulative revenue minus the whole day's expenses (expenses carry a date, not a time) */
  afterExpenses: number;
}

export interface SummaryModel {
  range: boolean;
  periodWord: "day" | "period";
  revenue: number;
  transactions: number;
  expenses: number;
  expenseCount: number;
  net: number;
  margin: number | null;
  expenseRatio: number | null;
  compare: { label: string; from: string; to: string; revenue: number; expenses: number; net: number; margin: number | null } | null;
  streams: SummaryLine[];
  methods: SummaryLine[];
  categories: SummaryLine[];
  pending: Row[];
  pendingTotal: number;
  days: SummaryDay[];
  hours: SummaryHour[];
  /** Hour of the day (0–23) by which collection covered the day's expenses; null if never / no expenses */
  breakEvenHour: number | null;
  avgPerDay: number | null;
  bestDay: SummaryDay | null;
  worstDay: SummaryDay | null;
  profitDays: number;
  lossDays: number;
  revenueError?: string;
  expenseError?: string;
}

const STREAMS: [string, string][] = [
  ["membership", "Membership"], ["services", "PT & Services"], ["merchandise", "Merchandise"],
  ["cafe", "Cafe & F&B"], ["equipment", "Equipment"],
];

export const marginOf = (net: number, revenue: number) => (revenue > 0 ? (net / revenue) * 100 : null);

/** % change; null when there's nothing to compare against. */
export function changePct(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const lines = (rows: Row[] | undefined): SummaryLine[] =>
  (rows || []).map((r) => ({ name: String(r.name), amount: num(r.amount), count: num(r.count), previous: num(r.previousAmount) }));

export function buildSummary(data: DayReportData): SummaryModel {
  const range = !!data.from && !!data.to && data.from !== data.to;
  const rev = data.revenue;
  const ins = rev?.insights;
  const cmp = rev?.comparison;

  const revenue = num(rev?.totalCollection?.total);
  const spent = spentExpenses(data.expenses);
  const pending = pendingExpenses(data.expenses);
  // Same rule as the server's expense total; the list is used so the figure survives a failed revenue section
  const expenses = data.expenses ? sum(spent, "amount") : num(rev?.expenses?.total);
  const net = revenue - expenses;

  // Revenue lines: per stream with the comparison period (insights), else the plain stream totals
  let streams: SummaryLine[] = lines(ins?.streams).filter((s) => s.amount !== 0 || num(s.previous) !== 0);
  if (!streams.length && rev?.streams) {
    streams = STREAMS.map(([k, name]) => ({ name, amount: num(rev.streams[k]?.total), count: num(rev.streams[k]?.count), previous: null }))
      .filter((s) => s.amount !== 0);
  }

  // Expense lines: by category from the approved/paid list, with the comparison period's figure by name
  const prevByCat = new Map(lines(ins?.expenseCategories).map((c) => [c.name.toLowerCase(), c.previous]));
  const cats = new Map<string, SummaryLine>();
  for (const x of spent) {
    const name = x.category && String(x.category).trim() ? String(x.category).trim() : "Uncategorized";
    const line = cats.get(name) || { name, amount: 0, count: 0, previous: prevByCat.get(name.toLowerCase()) ?? (ins ? 0 : null) };
    line.amount += num(x.amount);
    line.count += 1;
    cats.set(name, line);
  }
  // Categories spent on only in the comparison period still belong in the statement
  for (const c of lines(ins?.expenseCategories)) {
    if (c.amount === 0 && num(c.previous) > 0 && ![...cats.keys()].some((k) => k.toLowerCase() === c.name.toLowerCase())) {
      cats.set(c.name, { name: c.name, amount: 0, count: 0, previous: c.previous });
    }
  }
  const categories = [...cats.values()].sort((a, b) => b.amount - a.amount || num(b.previous) - num(a.previous));

  // One day is compared with the day before it, so call it that
  const cmpLabel = String(cmp?.label || "Previous period");
  const compare = cmp
    ? {
        label: !range && cmpLabel === "Previous period" ? "Previous day" : cmpLabel,
        from: String(rev.previousFrom || ""),
        to: String(rev.previousTo || ""),
        revenue: num(cmp.totalCollection?.total),
        expenses: num(cmp.expenses?.total),
        net: num(cmp.netRevenue?.total),
        margin: marginOf(num(cmp.netRevenue?.total), num(cmp.totalCollection?.total)),
      }
    : null;

  // Day by day (a range): the trend is daily and carries that day's approved/paid expenses
  const days: SummaryDay[] = [];
  if (range) {
    let running = 0;
    let prevRunning = 0;
    const prevTrend: Row[] = cmp?.trend || [];
    ((rev?.trend || []) as Row[]).forEach((t, i) => {
      const date = String(t.start || "").slice(0, 10);
      const r = num(t.revenue);
      const x = num(t.expenses);
      running += r - x;
      const p = prevTrend[i];
      if (p) prevRunning += num(p.revenue) - num(p.expenses);
      const d = parseISO(date);
      days.push({
        date, label: isValid(d) ? format(d, "EEE, dd MMM") : String(t.label), revenue: r, expenses: x,
        net: r - x, cumulative: running, previousCumulative: p ? prevRunning : null, margin: marginOf(r - x, r),
      });
    });
  }

  // Hour by hour (one day): cumulative takings against the day's expenses → break-even hour
  const hours: SummaryHour[] = [];
  let breakEvenHour: number | null = null;
  if (!range) {
    const byHour = data.collectionByHour || (rev?.trend || []).map((t: Row, h: number) => ({ hour: h, collection: t.revenue }));
    let running = 0;
    for (let h = 0; h < 24; h++) {
      const r = num(byHour[h]?.collection);
      running += r;
      hours.push({ hour: h, label: hourLabel(h), revenue: r, cumulative: running, afterExpenses: running - expenses });
      if (breakEvenHour === null && expenses > 0 && running >= expenses) breakEvenHour = h;
    }
  }

  const active = days.filter((d) => d.revenue !== 0 || d.expenses !== 0);
  const bestDay = active.length ? active.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worstDay = active.length ? active.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  return {
    range,
    periodWord: range ? "period" : "day",
    revenue,
    transactions: num(ins?.transactions ?? rev?.totalCollection?.count),
    expenses,
    expenseCount: data.expenses ? spent.length : num(rev?.expenses?.count),
    net,
    margin: marginOf(net, revenue),
    expenseRatio: revenue > 0 ? (expenses / revenue) * 100 : null,
    compare,
    streams,
    methods: lines(ins?.paymentMethods).filter((m) => m.amount !== 0 || num(m.previous) !== 0),
    categories,
    pending,
    pendingTotal: sum(pending, "amount"),
    days,
    hours,
    breakEvenHour,
    avgPerDay: range && days.length ? net / days.length : null,
    bestDay,
    worstDay: worstDay && bestDay && worstDay.date === bestDay.date ? null : worstDay,
    profitDays: days.filter((d) => d.net > 0).length,
    lossDays: days.filter((d) => d.net < 0).length,
    revenueError: data.errors?.revenue,
    expenseError: data.errors?.expenses,
  };
}

// ── Words ───────────────────────────────────────────────────────────────────

const pctText = (p: number | null) => (p === null ? "new" : `${p >= 0 ? "up" : "down"} ${Math.abs(p).toFixed(1)}%`);

/** Plain-language highlights, in the order an owner would want them. */
export function summaryInsights(s: SummaryModel, currency: string): string[] {
  const c = (v: number) => `${currency} ${money(v)}`;
  const out: string[] = [];
  const word = s.periodWord;
  if (s.revenue === 0 && s.expenses === 0) {
    return [`No revenue was collected and no approved expenses were recorded for this ${word}.`];
  }
  out.push(s.net >= 0
    ? `Net profit of ${c(s.net)} on revenue of ${c(s.revenue)}${s.margin !== null ? ` — a ${s.margin.toFixed(1)}% margin` : ""}.`
    : `Net loss of ${c(Math.abs(s.net))}: expenses of ${c(s.expenses)} were more than the ${c(s.revenue)} collected.`);
  if (s.expenseRatio !== null && s.expenses > 0) {
    out.push(`Expenses took ${s.expenseRatio.toFixed(1)}% of every ${currency} collected.`);
  }
  if (s.compare) {
    const label = s.compare.label.toLowerCase();
    const rc = changePct(s.revenue, s.compare.revenue);
    const xc = changePct(s.expenses, s.compare.expenses);
    const diff = s.net - s.compare.net;
    out.push(`Compared with the ${label}: revenue ${pctText(rc)}, expenses ${pctText(xc)}, net ${diff >= 0 ? "better" : "worse"} by ${c(Math.abs(diff))}.`);
  }
  const topStream = [...s.streams].sort((a, b) => b.amount - a.amount)[0];
  if (topStream && topStream.amount > 0 && s.revenue > 0) {
    out.push(`${topStream.name} brought in the most: ${c(topStream.amount)} (${((topStream.amount / s.revenue) * 100).toFixed(1)}% of revenue).`);
  }
  const topCat = s.categories[0];
  if (topCat && topCat.amount > 0 && s.expenses > 0) {
    out.push(`Biggest expense: ${topCat.name}, ${c(topCat.amount)} (${((topCat.amount / s.expenses) * 100).toFixed(1)}% of expenses).`);
  }
  if (s.range && s.days.length) {
    if (s.bestDay) out.push(`Best day: ${s.bestDay.label} with a net of ${c(s.bestDay.net)}.`);
    if (s.worstDay && s.worstDay.net < (s.bestDay?.net ?? 0)) out.push(`Weakest day: ${s.worstDay.label} with a net of ${c(s.worstDay.net)}.`);
    out.push(`${s.profitDays} profitable day${s.profitDays === 1 ? "" : "s"}, ${s.lossDays} loss-making day${s.lossDays === 1 ? "" : "s"}; average net ${c(s.avgPerDay ?? 0)} a day.`);
  }
  if (!s.range && s.expenses > 0) {
    out.push(s.breakEvenHour !== null
      ? `The day's expenses were covered by ${hourLabel((s.breakEvenHour + 1) % 24)}.`
      : `The day's collection never covered its expenses.`);
  }
  if (s.pending.length) {
    const one = s.pending.length === 1;
    out.push(`${s.pending.length} expense${one ? "" : "s"} (${c(s.pendingTotal)}) ${one ? "is" : "are"} still awaiting approval and ${one ? "isn't" : "aren't"} deducted; net would be ${c(s.net - s.pendingTotal)} if ${one ? "it were" : "they were"} approved.`);
  }
  return out;
}

// ── Blocks (text / Excel / print of the Summary view) ───────────────────────

const mc = (v: number | null | undefined): Cell => (v === null || v === undefined ? "—" : { money: v });
const chg = (cur: number, prev: number | null) => {
  if (prev === null) return "—";
  const p = changePct(cur, prev);
  return p === null ? "New" : `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
};
const pts = (cur: number | null, prev: number | null | undefined) =>
  cur === null || prev === null || prev === undefined ? "—" : `${cur - prev >= 0 ? "+" : "−"}${Math.abs(cur - prev).toFixed(1)} pts`;
const pctCell = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);

export function buildSummaryBlocks(s: SummaryModel, currency: string): Block[] {
  const prevLabel = s.compare ? `${s.compare.label}` : "Previous";
  const hasPrev = !!s.compare;
  const blocks: Block[] = [];

  // Profit & loss statement
  const st: Cell[][] = [];
  st.push(["REVENUE", "", "", "", ""]);
  for (const l of s.streams) st.push([`   ${l.name}`, l.count, { money: l.amount }, mc(l.previous), chg(l.amount, l.previous)]);
  st.push(["Total revenue", s.transactions, { money: s.revenue }, mc(s.compare?.revenue), chg(s.revenue, s.compare?.revenue ?? null)]);
  st.push(["", "", "", "", ""]);
  st.push(["LESS: EXPENSES (approved & paid)", "", "", "", ""]);
  if (!s.categories.length) st.push(["   No expenses", "", { money: 0 }, "", ""]);
  for (const l of s.categories) st.push([`   ${l.name}`, l.count, { money: -l.amount }, mc(l.previous === null ? null : -l.previous), chg(l.amount, l.previous)]);
  st.push(["Total expenses", s.expenseCount, { money: -s.expenses }, mc(s.compare ? -s.compare.expenses : null), chg(s.expenses, s.compare?.expenses ?? null)]);
  st.push(["", "", "", "", ""]);
  st.push([s.net >= 0 ? "NET PROFIT" : "NET LOSS", "", { money: s.net }, mc(s.compare?.net), chg(s.net, s.compare?.net ?? null)]);
  st.push(["Profit margin", "", pctCell(s.margin), pctCell(s.compare?.margin ?? null), pts(s.margin, s.compare?.margin)]);
  st.push(["Expense ratio", "", pctCell(s.expenseRatio),
    pctCell(s.compare && s.compare.revenue > 0 ? (s.compare.expenses / s.compare.revenue) * 100 : null), ""]);
  if (s.pending.length) {
    st.push(["", "", "", "", ""]);
    st.push(["Not deducted: awaiting approval", s.pending.length, { money: s.pendingTotal }, "", ""]);
    st.push(["Net if they were approved", "", { money: s.net - s.pendingTotal }, "", ""]);
  }
  blocks.push({
    id: "summary", title: "Revenue Summary (Revenue − Expenses)",
    description: hasPrev ? `Compared with the ${prevLabel.toLowerCase()}${s.compare?.from ? ` (${s.compare.from} to ${s.compare.to})` : ""}` : undefined,
    header: ["Line", "Count", "This " + s.periodWord, prevLabel, "Change"],
    rows: st,
    error: s.revenueError,
  });

  blocks.push({
    id: "highlights", title: "Highlights", header: ["#", "Highlight"], fullText: true,
    rows: summaryInsights(s, currency).map((t, i) => [String(i + 1), t]),
  });

  const share = (v: number, total: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "—");
  blocks.push({
    id: "revenueStreams", title: "Revenue by Stream", error: s.revenueError,
    header: ["Stream", "Transactions", "Amount", "Share", prevLabel, "Change"],
    rows: s.streams.map((l) => [l.name, l.count, { money: l.amount }, share(l.amount, s.revenue), mc(l.previous), chg(l.amount, l.previous)]),
    total: s.streams.length ? ["Total", s.transactions, { money: s.revenue }, s.revenue > 0 ? "100.0%" : "—", mc(s.compare?.revenue), chg(s.revenue, s.compare?.revenue ?? null)] : undefined,
    empty: `No revenue collected in this ${s.periodWord}.`,
  });

  const methodTotal = s.methods.reduce((a, m) => a + m.amount, 0);
  blocks.push({
    id: "revenueMethods", title: "Revenue by Payment Method", error: s.revenueError,
    header: ["Method", "Transactions", "Amount", "Share", prevLabel, "Change"],
    rows: s.methods.map((l) => [l.name, l.count, { money: l.amount }, share(l.amount, methodTotal), mc(l.previous), chg(l.amount, l.previous)]),
    total: s.methods.length ? ["Total", "", { money: methodTotal }, "100.0%", mc(s.methods.reduce((a, m) => a + num(m.previous), 0)), ""] : undefined,
    empty: `No payments received in this ${s.periodWord}.`,
  });

  blocks.push({
    id: "expenseLines", title: "Expenses by Category (deducted)", error: s.expenseError,
    header: ["Category", "Expenses", "Amount", "Share", prevLabel, "Change"],
    rows: s.categories.map((l) => [l.name, l.count, { money: l.amount }, share(l.amount, s.expenses), mc(l.previous), chg(l.amount, l.previous)]),
    total: s.categories.length ? ["Total", s.expenseCount, { money: s.expenses }, s.expenses > 0 ? "100.0%" : "—", mc(s.compare?.expenses), chg(s.expenses, s.compare?.expenses ?? null)] : undefined,
    empty: `No approved or paid expenses in this ${s.periodWord}.`,
  });

  if (s.range) {
    blocks.push({
      id: "netByDay", title: "Net by Day", error: s.revenueError,
      header: ["Date", "Revenue", "Expenses", "Net", "Running net", "Margin"],
      rows: s.days.map((d) => [d.label, { money: d.revenue }, { money: d.expenses }, { money: d.net }, { money: d.cumulative }, pctCell(d.margin)]),
      total: s.days.length ? ["Total", { money: s.revenue }, { money: s.expenses }, { money: s.net }, { money: s.net }, pctCell(s.margin)] : undefined,
    });
  } else {
    const active = s.hours.filter((h) => h.revenue !== 0);
    blocks.push({
      id: "netByHour", title: "Revenue by Hour", error: s.revenueError,
      description: s.expenses > 0 ? `Running total against the day's ${currency} ${money(s.expenses)} of expenses` : undefined,
      header: ["Hour", "Revenue", "Running total", "Running total − expenses"],
      rows: active.map((h) => [`${hourLabel(h.hour)} – ${hourLabel((h.hour + 1) % 24)}`, { money: h.revenue }, { money: h.cumulative }, { money: h.afterExpenses }]),
      total: active.length ? ["Total", { money: s.revenue }, { money: s.revenue }, { money: s.net }] : undefined,
      empty: "No revenue collected on this day.",
    });
  }

  if (s.pending.length) {
    blocks.push({
      id: "pendingExpenses", title: "Expenses Awaiting Approval (not deducted)",
      header: [...(s.range ? ["Date"] : []), "Vendor", "Category", "Amount", "Status"],
      rows: s.pending.map((x) => [
        ...(s.range ? [x.date ? format(parseISO(String(x.date)), "dd MMM yyyy") : "—"] : []),
        x.vendor, x.category, { money: num(x.amount) }, x.status,
      ]),
      total: ["Total", ...(s.range ? [""] : []), "", { money: s.pendingTotal }, ""],
    });
  }
  return blocks.map((b) => ({ ...b, empty: b.empty ?? `Nothing recorded in this ${s.periodWord}.` }));
}
