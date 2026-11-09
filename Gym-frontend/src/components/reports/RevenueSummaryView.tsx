import React, { useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Clock, Equal, Lightbulb, Minus, PieChart as PieIcon, Receipt, Scale,
  TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { CurrencyGlyph } from "../../utils/currency";
import { type Block, cellText, hourLabel, money, num, rightAligned } from "./dayReportBlocks";
import { type SummaryLine, type SummaryModel, changePct, summaryInsights } from "./revenueSummary";
import text from "./DayReport.module.css";
import styles from "./RevenueSummary.module.css";

// Fixed, validated categorical slots (same as the Reports pages) so meaning never shifts with the theme
const REVENUE = "var(--gb-primary-deep)";
const EXPENSE = "#eb6834";
const PROFIT = "#1baf7a";
const LOSS = "#e34948";
const RUNNING = "#6250d6";
const COMPARE = "#94A3B8";
const STREAM_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#e87ba4", "#6250d6", "#008300", "#eb6834", "#e34948"];
const MAX_EXPENSE_STEPS = 7;

const Money = ({ v, signed = false }: { v: number; signed?: boolean }) => (
  <span className={styles.money}>
    {signed && v < 0 ? "−" : ""}<CurrencyGlyph />{money(signed ? Math.abs(v) : v)}
  </span>
);

const compact = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 10_000 ? `${(a / 1000).toFixed(0)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : a.toFixed(0);
  return `${v < 0 ? "−" : ""}${s}`;
};

/** ▲/▼ with %, coloured by whether the move is good. */
function Change({ current, previous, goodWhenUp = true }: { current: number; previous: number | null | undefined; goodWhenUp?: boolean }) {
  if (previous === null || previous === undefined) return null;
  const p = changePct(current, previous);
  if (p === null) return <span className={`${styles.change} ${styles.flat}`}>New</span>;
  if (Math.abs(p) < 0.05) return <span className={`${styles.change} ${styles.flat}`}>0%</span>;
  const good = p > 0 === goodWhenUp;
  return (
    <span className={`${styles.change} ${good ? styles.good : styles.bad}`}>
      {p > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(p).toFixed(1)}%
    </span>
  );
}

function Pts({ current, previous }: { current: number | null; previous: number | null | undefined }) {
  if (current === null || previous === null || previous === undefined) return null;
  const d = current - previous;
  if (Math.abs(d) < 0.05) return <span className={`${styles.change} ${styles.flat}`}>±0 pts</span>;
  return <span className={`${styles.change} ${d > 0 ? styles.good : styles.bad}`}>{d > 0 ? "+" : "−"}{Math.abs(d).toFixed(1)} pts</span>;
}

function Panel({ title, icon: Icon, description, children, wide = false }: {
  title: string; icon: React.ElementType; description?: React.ReactNode; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <section className={`${styles.panel} ${wide ? styles.wide : ""}`} data-slot="card">
      <header className={styles.panelHead}>
        <h3><Icon size={17} />{title}</h3>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

const MoneyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label ?? payload[0]?.payload?.name}</p>
      {payload.map((p: any) => {
        const v = Array.isArray(p.value) ? p.payload.delta : p.value;
        return (
          <p key={p.dataKey} style={{ color: p.color === "transparent" ? undefined : p.color }}>
            {p.name}: <Money v={num(v)} signed />
          </p>
        );
      })}
    </div>
  );
};

/** One block as a clean statement table (the Text view's table styles). */
function BlockTable({ block }: { block: Block }) {
  const right = rightAligned(block);
  if (block.error) return <p className={text.plain}>{block.error}</p>;
  if (!block.rows.length) return <p className={text.plain}>{block.empty}</p>;
  return (
    <div className={text.tableWrap}>
      <table className={text.table}>
        <thead><tr>{block.header.map((h, i) => <th key={h} className={right[i] ? text.num : undefined}>{h}</th>)}</tr></thead>
        <tbody>
          {block.rows.map((r, ri) => (
            <tr key={ri}>{block.header.map((_, i) => <td key={i} className={right[i] ? text.num : undefined}>{cellText(r[i])}</td>)}</tr>
          ))}
        </tbody>
        {block.total && <tfoot><tr>{block.total.map((c, i) => <td key={i} className={right[i] ? text.num : undefined}>{cellText(c)}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

/** Revenue → expenses → net, as a waterfall of floating bars. */
function waterfall(s: SummaryModel) {
  type Step = { name: string; range: [number, number]; delta: number; kind: "revenue" | "total" | "expense" | "net"; text: string };
  const steps: Step[] = [];
  let run = 0;
  for (const l of s.streams.filter((x) => x.amount !== 0)) {
    steps.push({ name: l.name, range: [Math.min(run, run + l.amount), Math.max(run, run + l.amount)], delta: l.amount, kind: "revenue", text: `+${compact(l.amount)}` });
    run += l.amount;
  }
  steps.push({ name: "Total revenue", range: [Math.min(0, s.revenue), Math.max(0, s.revenue)], delta: s.revenue, kind: "total", text: compact(s.revenue) });
  run = s.revenue;
  const cats = s.categories.filter((c) => c.amount !== 0);
  const shown = cats.length > MAX_EXPENSE_STEPS ? cats.slice(0, MAX_EXPENSE_STEPS - 1) : cats;
  const rest = cats.length > MAX_EXPENSE_STEPS ? cats.slice(MAX_EXPENSE_STEPS - 1).reduce((a, c) => a + c.amount, 0) : 0;
  const expenseSteps: SummaryLine[] = rest ? [...shown, { name: "Other expenses", amount: rest, count: 0, previous: null }] : shown;
  for (const c of expenseSteps) {
    steps.push({ name: c.name, range: [Math.min(run - c.amount, run), Math.max(run - c.amount, run)], delta: -c.amount, kind: "expense", text: `−${compact(c.amount)}` });
    run -= c.amount;
  }
  steps.push({ name: s.net >= 0 ? "Net profit" : "Net loss", range: [Math.min(0, s.net), Math.max(0, s.net)], delta: s.net, kind: "net", text: compact(s.net) });
  return steps;
}

const stepColor = (kind: string, net: number) =>
  kind === "revenue" ? "#5b9be6" : kind === "total" ? REVENUE : kind === "expense" ? EXPENSE : net >= 0 ? PROFIT : LOSS;

/** The P&L statement, styled like an accountant would lay it out. */
function Statement({ s }: { s: SummaryModel }) {
  const prev = !!s.compare;
  const row = (label: React.ReactNode, cur: React.ReactNode, p?: React.ReactNode, change?: React.ReactNode, cls?: string, count?: number | string) => (
    <tr className={cls}>
      <td>{label}</td>
      <td className={styles.numCell}>{count ?? ""}</td>
      <td className={styles.numCell}>{cur}</td>
      {prev && <td className={styles.numCell}>{p}</td>}
      {prev && <td className={styles.numCell}>{change}</td>}
    </tr>
  );
  return (
    <div className={text.tableWrap}>
      <table className={styles.statement}>
        <thead>
          <tr>
            <th />
            <th className={styles.numCell}>Count</th>
            <th className={styles.numCell}>This {s.periodWord}</th>
            {prev && <th className={styles.numCell}>{s.compare!.label}</th>}
            {prev && <th className={styles.numCell}>Change</th>}
          </tr>
        </thead>
        <tbody>
          <tr className={styles.groupHead}><td colSpan={prev ? 5 : 3}>Revenue</td></tr>
          {s.streams.length === 0 && row(<span className={styles.indent}>No revenue collected</span>, <Money v={0} />)}
          {s.streams.map((l) => (
            <React.Fragment key={l.name}>
              {row(<span className={styles.indent}>{l.name}</span>, <Money v={l.amount} />, l.previous === null ? "—" : <Money v={l.previous} />,
                <Change current={l.amount} previous={l.previous} />, undefined, l.count)}
            </React.Fragment>
          ))}
          {row("Total revenue", <Money v={s.revenue} />, s.compare ? <Money v={s.compare.revenue} /> : null,
            <Change current={s.revenue} previous={s.compare?.revenue} />, styles.subtotal, s.transactions)}

          <tr className={styles.groupHead}><td colSpan={prev ? 5 : 3}>Less: expenses (approved &amp; paid)</td></tr>
          {s.categories.length === 0 && row(<span className={styles.indent}>No expenses</span>, <Money v={0} />)}
          {s.categories.map((l) => (
            <React.Fragment key={l.name}>
              {row(<span className={styles.indent}>{l.name}</span>, <Money v={-l.amount} signed />,
                l.previous === null ? "—" : <Money v={-l.previous} signed />,
                <Change current={l.amount} previous={l.previous} goodWhenUp={false} />, undefined, l.count)}
            </React.Fragment>
          ))}
          {row("Total expenses", <Money v={-s.expenses} signed />, s.compare ? <Money v={-s.compare.expenses} signed /> : null,
            <Change current={s.expenses} previous={s.compare?.expenses} goodWhenUp={false} />, styles.subtotal, s.expenseCount)}

          {row(s.net >= 0 ? "Net profit" : "Net loss", <Money v={s.net} signed />, s.compare ? <Money v={s.compare.net} signed /> : null,
            <Change current={s.net} previous={s.compare?.net} />, `${styles.netRow} ${s.net >= 0 ? styles.netGood : styles.netBad}`)}
          {row("Profit margin", s.margin === null ? "—" : `${s.margin.toFixed(1)}%`,
            s.compare ? (s.compare.margin === null ? "—" : `${s.compare.margin.toFixed(1)}%`) : null,
            <Pts current={s.margin} previous={s.compare?.margin} />, styles.ratioRow)}
          {row("Expense ratio", s.expenseRatio === null ? "—" : `${s.expenseRatio.toFixed(1)}%`,
            s.compare ? (s.compare.revenue > 0 ? `${((s.compare.expenses / s.compare.revenue) * 100).toFixed(1)}%` : "—") : null,
            null, styles.ratioRow)}
          {s.pending.length > 0 && (
            <>
              {row(<span className={styles.muted}>Not deducted: awaiting approval</span>, <span className={styles.muted}><Money v={s.pendingTotal} /></span>, prev ? "" : undefined, prev ? "" : undefined, styles.noteRow, s.pending.length)}
              {row(<span className={styles.muted}>Net if they were approved</span>, <span className={styles.muted}><Money v={s.net - s.pendingTotal} signed /></span>, prev ? "" : undefined, prev ? "" : undefined, styles.noteRow)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Day Report › Summary: only the money — total revenue minus expenses — as headline figures,
 * a revenue-to-net waterfall, the trend of revenue/expenses/net, breakdowns, a P&L statement,
 * plain-language highlights and the detail tables. Every figure comes from buildSummary, the
 * same model the text/Excel exports use.
 */
export function RevenueSummaryView({ s, blocks, title, subtitle, currencyCode }: {
  s: SummaryModel; blocks: Block[]; title: string; subtitle: string; currencyCode: string;
}) {
  const insights = useMemo(() => summaryInsights(s, currencyCode), [s, currencyCode]);
  const steps = useMemo(() => waterfall(s), [s]);
  const block = (id: string) => blocks.find((b) => b.id === id);
  const cmpLabel = s.compare?.label ?? "";
  const cmpRange = (() => {
    if (!s.compare?.from) return "";
    const f = parseISO(s.compare.from);
    const t = parseISO(s.compare.to);
    if (!isValid(f) || !isValid(t)) return "";
    return s.compare.from === s.compare.to ? format(f, "dd MMM yyyy") : `${format(f, "dd MMM")} – ${format(t, "dd MMM yyyy")}`;
  })();
  const netGood = s.net >= 0;

  const dayChart = s.days.map((d) => ({
    name: d.label, Revenue: d.revenue, Expenses: -d.expenses, Net: d.net,
  }));
  const runningChart = s.days.map((d) => ({ name: d.label, current: d.cumulative, previous: d.previousCumulative }));
  const hasPrevRunning = !!s.compare && s.days.some((d) => d.previousCumulative !== null);
  const firstHour = s.hours.findIndex((h) => h.revenue !== 0);
  const lastHour = 23 - [...s.hours].reverse().findIndex((h) => h.revenue !== 0);
  const hourChart = s.hours
    .filter((h) => h.hour >= Math.min(firstHour < 0 ? 6 : firstHour, 6) && h.hour <= Math.max(firstHour < 0 ? 22 : lastHour, 22))
    .map((h) => ({ name: h.label, Revenue: h.revenue, "Running total": h.cumulative }));
  const streamPie = s.streams.filter((l) => l.amount > 0).map((l, i) => ({ name: l.name, value: l.amount, color: STREAM_COLORS[i % STREAM_COLORS.length] }));
  const catBars = s.categories.filter((c) => c.amount > 0 || num(c.previous) > 0).slice(0, 10)
    .map((c) => ({ name: c.name, current: c.amount, previous: num(c.previous) }));
  const vsChart = s.compare ? [
    { name: "Revenue", current: s.revenue, previous: s.compare.revenue },
    { name: "Expenses", current: s.expenses, previous: s.compare.expenses },
    { name: s.net >= 0 ? "Net profit" : "Net", current: s.net, previous: s.compare.net },
  ] : [];

  return (
    <div className={styles.stack}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        {s.compare && <p className={styles.subtitle}>Compared with the {cmpLabel.toLowerCase()}{cmpRange ? ` (${cmpRange})` : ""}</p>}
      </div>

      {(s.revenueError || s.expenseError) && (
        <div className={styles.warn}><AlertCircle size={16} />
          {s.revenueError ? "Revenue couldn't be loaded, so these figures are incomplete." : "Expenses couldn't be loaded, so these figures are incomplete."}
        </div>
      )}

      {/* Revenue − Expenses = Net */}
      <div className={styles.equation}>
        <div className={`${styles.eqTile} ${styles.eqRevenue}`}>
          <span className={styles.eqLabel}><Wallet size={15} />Total revenue</span>
          <span className={styles.eqValue}><Money v={s.revenue} /></span>
          <span className={styles.eqSub}>{s.transactions.toLocaleString()} transaction{s.transactions === 1 ? "" : "s"}</span>
          {s.compare && <span className={styles.eqSub}><Change current={s.revenue} previous={s.compare.revenue} /> {cmpLabel.toLowerCase()}: <Money v={s.compare.revenue} /></span>}
        </div>
        <span className={styles.operator} aria-hidden><Minus size={22} /></span>
        <div className={`${styles.eqTile} ${styles.eqExpense}`}>
          <span className={styles.eqLabel}><TrendingDown size={15} />Expenses</span>
          <span className={styles.eqValue}><Money v={s.expenses} /></span>
          <span className={styles.eqSub}>{s.expenseCount} approved / paid</span>
          {s.compare && <span className={styles.eqSub}><Change current={s.expenses} previous={s.compare.expenses} goodWhenUp={false} /> {cmpLabel.toLowerCase()}: <Money v={s.compare.expenses} /></span>}
        </div>
        <span className={styles.operator} aria-hidden><Equal size={22} /></span>
        <div className={`${styles.eqTile} ${netGood ? styles.eqProfit : styles.eqLoss}`}>
          <span className={styles.eqLabel}>{netGood ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{netGood ? "Net profit" : "Net loss"}</span>
          <span className={styles.eqValue}><Money v={s.net} signed /></span>
          <span className={styles.eqSub}>{s.margin === null ? "No revenue to measure a margin" : `${s.margin.toFixed(1)}% margin`}</span>
          {s.compare && <span className={styles.eqSub}><Change current={s.net} previous={s.compare.net} /> {cmpLabel.toLowerCase()}: <Money v={s.compare.net} signed /></span>}
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}><span>Profit margin</span><strong>{s.margin === null ? "—" : `${s.margin.toFixed(1)}%`}</strong><Pts current={s.margin} previous={s.compare?.margin} /></div>
        <div className={styles.kpi}><span>Expense ratio</span><strong>{s.expenseRatio === null ? "—" : `${s.expenseRatio.toFixed(1)}%`}</strong><em>of revenue spent</em></div>
        {s.range ? (
          <>
            <div className={styles.kpi}><span>Average net / day</span><strong><Money v={s.avgPerDay ?? 0} signed /></strong><em>over {s.days.length} days</em></div>
            <div className={styles.kpi}><span>Profitable days</span><strong>{s.profitDays} / {s.days.length}</strong><em>{s.lossDays} loss-making</em></div>
          </>
        ) : (
          <div className={styles.kpi}><span>Break-even</span>
            <strong>{s.expenses === 0 ? "No expenses" : s.breakEvenHour === null ? "Not reached" : `by ${hourLabel((s.breakEvenHour + 1) % 24)}`}</strong>
            <em>{s.expenses === 0 ? "nothing to cover" : "when takings covered the day's expenses"}</em></div>
        )}
        <div className={`${styles.kpi} ${s.pending.length ? styles.kpiWarn : ""}`}><span>Awaiting approval</span>
          <strong><Money v={s.pendingTotal} /></strong><em>{s.pending.length} expense{s.pending.length === 1 ? "" : "s"} not deducted</em></div>
      </div>

      <Panel title="From Revenue to Net" icon={Scale} wide
        description="Each revenue stream builds up the total; each expense category takes away from it, leaving the net">
        {s.revenue === 0 && s.expenses === 0 ? <p className={text.plain}>No revenue or expenses in this {s.periodWord}.</p> : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={steps} margin={{ top: 22, left: 4, right: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={48} angle={steps.length > 8 ? -20 : 0} textAnchor={steps.length > 8 ? "end" : "middle"} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={compact} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgb(148 163 184 / 0.12)" }} />
              <Bar dataKey="range" name="Amount" radius={4} isAnimationActive={false} maxBarSize={64}>
                {steps.map((st, i) => <Cell key={i} fill={stepColor(st.kind, s.net)} />)}
                <LabelList dataKey="text" position="top" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className={styles.legend}>
          <span><i style={{ background: "#5b9be6" }} />Revenue stream</span>
          <span><i style={{ background: REVENUE }} />Total revenue</span>
          <span><i style={{ background: EXPENSE }} />Expense category</span>
          <span><i style={{ background: netGood ? PROFIT : LOSS }} />{netGood ? "Net profit" : "Net loss"}</span>
        </div>
      </Panel>

      {s.range ? (
        <>
        <Panel title="Revenue, Expenses & Net by Day" icon={TrendingUp} wide
          description="Revenue above the line, expenses below it; the green line is each day's net">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dayChart} margin={{ top: 8, left: 4, right: 12 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} minTickGap={12} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={compact} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Tooltip content={<MoneyTooltip />} />
              <Legend />
              <Bar dataKey="Revenue" fill={REVENUE} stackId="flow" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={28} />
              <Bar dataKey="Expenses" fill={EXPENSE} stackId="flow" radius={[0, 0, 3, 3]} isAnimationActive={false} maxBarSize={28} />
              <Line type="monotone" dataKey="Net" stroke={PROFIT} strokeWidth={2} dot={dayChart.length <= 31 ? { r: 3, fill: PROFIT } : false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Running Net" icon={Scale} wide
          description={hasPrevRunning
            ? `Net added up day by day; the dotted line is the ${cmpLabel.toLowerCase()} on the same day number`
            : "Net added up day by day"}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={runningChart} margin={{ top: 8, left: 4, right: 12 }}>
              <defs>
                <linearGradient id="runningNetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RUNNING} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={RUNNING} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} minTickGap={12} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={compact} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Tooltip content={<MoneyTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="current" name={`This ${s.periodWord}`} stroke={RUNNING} strokeWidth={2} fill="url(#runningNetFill)" isAnimationActive={false} />
              {hasPrevRunning && (
                <Line type="monotone" dataKey="previous" name={cmpLabel} stroke={COMPARE} strokeWidth={2} strokeDasharray="3 4" dot={false} connectNulls isAnimationActive={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        </>
      ) : (
        <Panel title="Takings Through the Day" icon={Clock} wide
          description={s.expenses > 0
            ? "Hourly revenue (bars) and the running total (line) against the day's expenses (dashed): where the line crosses it, the day broke even"
            : "Hourly revenue (bars) and the running total (line)"}>
          {s.revenue === 0 ? <p className={text.plain}>No revenue collected on this day.</p> : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={hourChart} margin={{ top: 16, left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={compact} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                {s.expenses > 0 && (
                  <ReferenceLine y={s.expenses} stroke={EXPENSE} strokeDasharray="6 4"
                    label={{ value: `Day's expenses ${compact(s.expenses)}`, position: "insideTopLeft", fontSize: 11, fill: EXPENSE }} />
                )}
                <Bar dataKey="Revenue" fill={REVENUE} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={30} />
                <Line type="stepAfter" dataKey="Running total" stroke={RUNNING} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Panel>
      )}

      <div className={styles.grid2}>
        <Panel title="Where the Revenue Came From" icon={PieIcon}>
          {streamPie.length === 0 ? <p className={text.plain}>No revenue collected in this {s.periodWord}.</p> : (
            <div className={styles.donutRow}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={streamPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                    {streamPie.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip content={<MoneyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className={styles.donutLegend}>
                {streamPie.map((p) => (
                  <li key={p.name}>
                    <i style={{ background: p.color }} /><span>{p.name}</span>
                    <strong><Money v={p.value} /></strong>
                    <em>{s.revenue > 0 ? `${((p.value / s.revenue) * 100).toFixed(1)}%` : "—"}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {block("revenueStreams") && <BlockTable block={block("revenueStreams")!} />}
        </Panel>

        <Panel title="Where the Money Went" icon={Receipt} description="Approved and paid expenses by category">
          {catBars.length === 0 ? <p className={text.plain}>No approved or paid expenses in this {s.periodWord}.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(200, catBars.length * 40 + 50)}>
              <BarChart data={catBars} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={compact} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                <Tooltip content={<MoneyTooltip />} />
                {s.compare && <Legend />}
                <Bar dataKey="current" name={`This ${s.periodWord}`} fill={EXPENSE} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                {s.compare && <Bar dataKey="previous" name={cmpLabel} fill={COMPARE} radius={[0, 4, 4, 0]} isAnimationActive={false} />}
              </BarChart>
            </ResponsiveContainer>
          )}
          {block("expenseLines") && <BlockTable block={block("expenseLines")!} />}
        </Panel>
      </div>

      <div className={styles.grid2}>
        {s.compare && (
          <Panel title={`This ${s.periodWord} vs ${cmpLabel}`} icon={Scale} description={cmpRange}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vsChart} margin={{ top: 8, left: 4, right: 12 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={compact} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Bar dataKey="current" name={`This ${s.periodWord}`} fill={REVENUE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="previous" name={cmpLabel} fill={COMPARE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
        <Panel title="How It Was Paid" icon={Wallet} description="Revenue by payment method">
          {block("revenueMethods") && <BlockTable block={block("revenueMethods")!} />}
        </Panel>
      </div>

      <Panel title="Profit & Loss Statement" icon={Scale} wide
        description="Revenue collected, less the expenses approved or paid for the same dates">
        <Statement s={s} />
      </Panel>

      <Panel title="Highlights" icon={Lightbulb} wide>
        <ul className={styles.insights}>
          {insights.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Panel>

      {s.range
        ? block("netByDay") && (
          <Panel title="Net by Day" icon={TrendingUp} wide description="Every day's revenue, expenses, net and running net">
            <BlockTable block={block("netByDay")!} />
          </Panel>
        )
        : block("netByHour") && (
          <Panel title="Revenue by Hour" icon={Clock} wide description={block("netByHour")!.description}>
            <BlockTable block={block("netByHour")!} />
          </Panel>
        )}

      {block("pendingExpenses") && (
        <Panel title="Expenses Awaiting Approval" icon={AlertCircle} wide
          description="Recorded but not yet approved, so they are not deducted above">
          <BlockTable block={block("pendingExpenses")!} />
        </Panel>
      )}
    </div>
  );
}
