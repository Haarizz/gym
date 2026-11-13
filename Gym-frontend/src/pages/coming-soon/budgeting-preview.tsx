/**
 * Budgeting — coming soon (/budgeting). Preview on sample data (budgeting-mock.ts): budgets per
 * category and branch, approvals, budget vs actual, insights and spending rules.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, Building2, CheckCircle2, ClipboardCheck, Gauge, Lightbulb, ListChecks, PiggyBank,
  Plus, Scale, Search, ShieldCheck, Target, TrendingUp, Wallet, XCircle,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from "recharts";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import {
  BarRows, ChartTip, Empty, Kpi, Legend, Panel, SectionTabs, Status, axisTick, fmtDate, fmtInt, seriesOf, styles, usePalette,
} from "../../components/overview/overview-kit";
import { Meter, PreviewBanner, initialsOf, lastMonths, ps, soon, useMoney } from "../../components/coming-soon/preview-kit";
import { APPROVALS, BUDGETS, BVA, Budget, BudgetState, INSIGHTS, RULES, TREND, stateOf } from "./budgeting-mock";

type Tab = "overview" | "budgets" | "approvals" | "branches" | "analysis" | "rules";

const STATE_KIND: Record<BudgetState, "good" | "info" | "warning" | "critical"> = { Safe: "good", Watch: "info", "At risk": "warning", Overspent: "critical" };

export function Budgeting() {
  const palette = usePalette();
  const series = seriesOf(palette);
  const { money, compact } = useMoney();
  const [tab, setTab] = useState<Tab>("overview");
  const [branch, setBranch] = useState("all");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<BudgetState | "all">("all");
  const [rules, setRules] = useState(RULES);

  const branches = useMemo(() => [...new Set(BUDGETS.map(b => b.branch))], []);
  const scoped = BUDGETS.filter(b => branch === "all" || b.branch === branch);
  const total = scoped.reduce((n, b) => n + b.amount, 0);
  const spent = scoped.reduce((n, b) => n + b.spent, 0);
  const remaining = total - spent;
  const usedPct = total ? (spent / total) * 100 : 0;
  const atRisk = scoped.filter(b => stateOf(b) === "At risk").length;
  const over = scoped.filter(b => stateOf(b) === "Overspent").length;
  const pending = APPROVALS.filter(a => a.status === "Pending");
  const colorOf = (b: Budget) => ({ Safe: palette.s3, Watch: palette.s1, "At risk": palette.s5, Overspent: palette.bad }[stateOf(b)]);

  const months = lastMonths(6);
  const bva = BVA.map((m, i) => ({ ...m, label: months[i] }));
  const trend = TREND.map((m, i) => ({ ...m, label: months[i] }));
  // Cumulative spend this month vs an even pace through the month.
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  // Sample forecast: most of a month's bills (stock, rent-like costs) land early, so the rest
  // of the month adds a share of what is left rather than a straight-line projection.
  const forecast = Math.round(spent + Math.max(0, total - spent) * 0.7 + Math.max(0, spent - total) * 0.15);
  const pace = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const actual = d <= dayOfMonth ? Math.round(spent * Math.pow(d / dayOfMonth, 0.6)) : null;
    const f = d >= dayOfMonth ? Math.round(spent + (forecast - spent) * ((d - dayOfMonth) / Math.max(1, daysInMonth - dayOfMonth))) : null;
    return { label: String(d), budget: Math.round((total * d) / daysInMonth), actual, forecast: f };
  });

  const byCategory = useMemo(() => {
    const m = new Map<string, { amount: number; spent: number }>();
    scoped.forEach(b => { const x = m.get(b.category) ?? { amount: 0, spent: 0 }; x.amount += b.amount; x.spent += b.spent; m.set(b.category, x); });
    return [...m.entries()].map(([k, v]) => ({ category: k, ...v })).sort((x, y) => y.spent - x.spent);
  }, [scoped]);

  const rows = scoped.filter(b => (stateFilter === "all" || stateOf(b) === stateFilter)
    && (!query.trim() || `${b.category} ${b.department} ${b.owner} ${b.id}`.toLowerCase().includes(query.trim().toLowerCase())));

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Budgeting</h1>
          <div className={styles.subtitle}>Plan spending per category and branch, and see it against what's actually spent · {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        </div>
        <div className={styles.actions}>
          <select className={ps.select} value={branch} onChange={e => setBranch(e.target.value)} aria-label="Branch">
            <option value="all">All branches</option>{branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Button size="sm" onClick={() => soon("Creating a budget")}><Plus className="h-4 w-4 mr-2" />New budget</Button>
        </div>
      </div>
      <PreviewBanner module="Budgeting" features={["Budgets per category & branch", "Approval workflow", "Overspend alerts", "Budget vs actual from the ledger"]} />

      <div className={styles.kpis}>
        <Kpi icon={PiggyBank} tone="blue" label="Budgeted" value={money(total)} hint={`${scoped.length} budgets`} />
        <Kpi icon={Wallet} tone="orange" label="Spent" value={money(spent)} hint={`${Math.round(usedPct)}% used · day ${dayOfMonth} of ${daysInMonth}`} />
        <Kpi icon={Scale} tone={remaining < 0 ? "red" : "green"} label={remaining < 0 ? "Over budget" : "Remaining"} value={money(Math.abs(remaining))} />
        <Kpi icon={TrendingUp} tone={forecast > total ? "red" : "teal"} label="Month-end forecast" value={money(forecast)} hint={forecast > total ? `${money(forecast - total)} over` : "within budget"} onClick={() => setTab("analysis")} />
        <Kpi icon={AlertTriangle} tone={over ? "red" : "amber"} label="Needs attention" value={fmtInt(over + atRisk)} hint={`${over} overspent · ${atRisk} at risk`} onClick={() => { setTab("budgets"); setStateFilter(over ? "Overspent" : "At risk"); }} />
        <Kpi icon={ClipboardCheck} tone="violet" label="Awaiting approval" value={fmtInt(pending.length)} hint={money(pending.reduce((n, a) => n + a.amount, 0))} onClick={() => setTab("approvals")} />
      </div>

      <SectionTabs<Tab>
        tabs={[
          { id: "overview", label: "Overview", icon: Gauge },
          { id: "budgets", label: "Budgets", icon: ListChecks, count: scoped.length },
          { id: "approvals", label: "Approvals", icon: ClipboardCheck, count: pending.length },
          { id: "branches", label: "Branches", icon: Building2 },
          { id: "analysis", label: "Budget vs actual", icon: BarChart3 },
          { id: "rules", label: "Rules", icon: ShieldCheck },
        ]}
        value={tab} onChange={setTab} label="Budgeting sections"
      />

      {tab === "overview" && (
        <>
          <div className={styles.row2}>
            <Panel title="Budget vs actual" icon={BarChart3} scope="Last 6 months" sub="Monthly budget against what was spent, all branches">
              <div className={styles.chart}>
                <ResponsiveContainer>
                  <ComposedChart data={bva} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={60} tickFormatter={v => compact(Number(v))} />
                    <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                    <Bar isAnimationActive={false} dataKey="budget" name="Budget" fill={palette.soft} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar isAnimationActive={false} dataKey="actual" name="Actual" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[{ label: "Budget", color: palette.soft }, { label: "Actual", color: palette.s1 }]} />
            </Panel>
            <Panel title="Worth a look" icon={Lightbulb} sub="Spotted in this month's spending">
              <div className={styles.insights}>
                {INSIGHTS.map(i => (
                  <div key={i.title} className={styles.insight} data-type={i.type}>
                    <span className={styles.insightIcon}>{i.type === "positive" ? <CheckCircle2 size={15} /> : i.type === "info" ? <Lightbulb size={15} /> : <AlertTriangle size={15} />}</span>
                    <div>
                      <div className={styles.insightTag}>{i.tag}</div>
                      <div className={styles.insightTitle}>{i.title}</div>
                      <div className={styles.insightDetail}>{i.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <div className={styles.cols2}>
            <Panel title="Spent by category" icon={Wallet} sub={branch === "all" ? "All branches" : branch}>
              <BarRows rows={byCategory.map((c, i) => ({ key: c.category, label: c.category, value: c.spent, color: series[i % series.length], meta: `${Math.round((c.spent / c.amount) * 100)}% of ${compact(c.amount)}` }))}
                fmt={money} empty="No budgets for this branch." />
            </Panel>
            <Panel title="Closest to the limit" icon={Target} sub="Budgets by share used; the tick marks the alert threshold"
              action={<Button variant="outline" size="sm" onClick={() => setTab("budgets")}>All budgets</Button>}>
              <div className={styles.list}>
                {[...scoped].sort((x, y) => y.spent / y.amount - x.spent / x.amount).slice(0, 5).map(b => (
                  <div key={b.id} className={styles.listRow} style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(8rem, 12rem)" }}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowName}>{b.category}</span>
                      <span className={styles.rowMeta}>{b.branch} · {money(b.spent)} of {money(b.amount)}</span>
                    </div>
                    <Meter pct={(b.spent / b.amount) * 100} color={colorOf(b)} tick={b.threshold} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === "budgets" && (
        <Panel title="Budgets" icon={ListChecks} sub="The tick on each bar is the alert threshold" action={<span className={styles.scope}>{rows.length} shown</span>}>
          <div className={ps.toolbar}>
            <label className={ps.search}><Search aria-hidden /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search category, department, owner…" aria-label="Search budgets" /></label>
            <div className={styles.chips}>
              {(["all", "Safe", "Watch", "At risk", "Overspent"] as const).map(st => (
                <button key={st} type="button" className={styles.chip} data-active={stateFilter === st} onClick={() => setStateFilter(st)}>
                  {st === "all" ? "All" : `${st} · ${scoped.filter(b => stateOf(b) === st).length}`}
                </button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? <Empty icon={Search} title="No budgets match" /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Category</th><th>Branch</th><th>Period</th><th>Owner</th><th style={{ minWidth: 190 }}>Used</th><th>Status</th><th className={styles.num}>Spent</th><th className={styles.num}>Budget</th><th className={styles.num}>Left</th></tr></thead>
                <tbody>
                  {rows.map(b => {
                    const left = b.amount - b.spent;
                    return (
                      <tr key={b.id} className={ps.clickRow} onClick={() => soon("Editing a budget")}>
                        <td><div className={ps.cellMain}>{b.category}</div><div className={ps.cellSub}>{b.id} · {b.department}</div></td>
                        <td>{b.branch}</td>
                        <td>{b.type}</td>
                        <td><span className={ps.entity}><span className={`${styles.avatar} ${ps.initials}`} style={{ ["--tone" as any]: palette.s4, width: 26, height: 26 }}>{initialsOf(b.owner)}</span>{b.owner}</span></td>
                        <td><Meter pct={(b.spent / b.amount) * 100} color={colorOf(b)} tick={b.threshold} /></td>
                        <td><Status kind={STATE_KIND[stateOf(b)]}>{stateOf(b)}</Status></td>
                        <td className={styles.num}>{money(b.spent)}</td>
                        <td className={styles.num}>{money(b.amount)}</td>
                        <td className={styles.num} style={{ fontWeight: 700, color: left < 0 ? "var(--status-critical)" : undefined }}>{left < 0 ? "−" : ""}{money(Math.abs(left))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan={6}>Total</td><td className={styles.num}>{money(rows.reduce((n, b) => n + b.spent, 0))}</td><td className={styles.num}>{money(rows.reduce((n, b) => n + b.amount, 0))}</td><td className={styles.num}>{money(rows.reduce((n, b) => n + b.amount - b.spent, 0))}</td></tr></tfoot>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "approvals" && (
        <Panel title="Budget requests" icon={ClipboardCheck} sub="New budgets and increases waiting for a decision">
          <div className={ps.cardGrid}>
            {APPROVALS.map(a => (
              <div key={a.id} className={ps.card}>
                <div className={ps.cardHead}>
                  <div>
                    <div className={ps.cardTitle}>{a.category}</div>
                    <div className={ps.cardMeta}><span>{a.id}</span><span>{a.branch}</span></div>
                  </div>
                  <Status kind={a.status === "Pending" ? "warning" : "info"}>{a.status}</Status>
                </div>
                <div className={ps.bigNum}>{money(a.amount)}{a.current ? <span className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}> · now {money(a.current)}</span> : null}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", lineHeight: 1.45 }}>{a.reason}</div>
                <div className={ps.cardFoot}>
                  <span>{a.by} · {fmtDate(a.date)}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <Button size="sm" variant="outline" onClick={() => soon("Rejecting budget requests")}><XCircle className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => soon("Approving budget requests")}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "branches" && (
        <Panel title="Branches" icon={Building2} sub="Each branch's budget this month">
          <div className={ps.cardGrid}>
            {branches.map(br => {
              const list = BUDGETS.filter(b => b.branch === br);
              const bt = list.reduce((n, b) => n + b.amount, 0), bs = list.reduce((n, b) => n + b.spent, 0);
              const overs = list.filter(b => stateOf(b) === "Overspent").length;
              return (
                <button key={br} type="button" className={ps.card} onClick={() => { setBranch(br); setTab("budgets"); }}>
                  <div className={ps.cardHead}>
                    <div className={ps.cardTitle}>{br}</div>
                    <Status kind={bs > bt ? "critical" : overs ? "warning" : "good"}>{bs > bt ? "Over budget" : overs ? `${overs} overspent` : "On track"}</Status>
                  </div>
                  <div className={ps.bigNum}>{money(bs)} <span className={styles.muted} style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>of {money(bt)}</span></div>
                  <Meter pct={(bs / bt) * 100} color={bs > bt ? palette.bad : palette.s3} />
                  <div className={ps.cardFoot}><span>{list.length} budgets</span><span>{bt - bs >= 0 ? `${money(bt - bs)} left` : `${money(bs - bt)} over`}</span></div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === "analysis" && (
        <>
          <Panel title="This month's pace" icon={TrendingUp} sub="Cumulative spend against an even pace through the month, with the month-end forecast">
            <div className={styles.chart}>
              <ResponsiveContainer>
                <ComposedChart data={pace} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} interval={4} />
                  <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={60} tickFormatter={v => compact(Number(v))} />
                  <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} />
                  <Line isAnimationActive={false} dataKey="budget" name="Even pace" stroke={palette.axis} strokeDasharray="5 4" dot={false} strokeWidth={2} />
                  <Line isAnimationActive={false} dataKey="actual" name="Spent" stroke={palette.s1} dot={false} strokeWidth={2.5} />
                  <Line isAnimationActive={false} dataKey="forecast" name="Forecast" stroke={palette.s2} strokeDasharray="2 4" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: "Even pace", color: palette.axis, line: true }, { label: "Spent", color: palette.s1, line: true }, { label: "Forecast", color: palette.s2, line: true }]} />
          </Panel>
          <div className={styles.cols2}>
            <Panel title="Spend by category" icon={BarChart3} scope="Last 6 months" sub="Where the money goes each month">
              <div className={styles.chart}>
                <ResponsiveContainer>
                  <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={56} tickFormatter={v => compact(Number(v))} />
                    <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                    <Bar isAnimationActive={false} stackId="s" dataKey="inventory" name="Stock" fill={series[0]} maxBarSize={36} />
                    <Bar isAnimationActive={false} stackId="s" dataKey="marketing" name="Marketing" fill={series[1]} maxBarSize={36} />
                    <Bar isAnimationActive={false} stackId="s" dataKey="utilities" name="Utilities" fill={series[2]} maxBarSize={36} />
                    <Bar isAnimationActive={false} stackId="s" dataKey="maintenance" name="Maintenance" fill={series[3]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[{ label: "Stock", color: series[0] }, { label: "Marketing", color: series[1] }, { label: "Utilities", color: series[2] }, { label: "Maintenance", color: series[3] }]} />
            </Panel>
            <Panel title="Biggest differences" icon={Scale} sub="Categories furthest from their budget this month">
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Category</th><th className={styles.num}>Budget</th><th className={styles.num}>Actual</th><th className={styles.num}>Difference</th></tr></thead>
                  <tbody>
                    {[...byCategory].sort((x, y) => Math.abs(y.spent - y.amount) - Math.abs(x.spent - x.amount)).map(c => {
                      const d = c.spent - c.amount;
                      return (
                        <tr key={c.category}>
                          <td>{c.category}</td>
                          <td className={styles.num}>{money(c.amount)}</td>
                          <td className={styles.num}>{money(c.spent)}</td>
                          <td className={styles.num} style={{ fontWeight: 700, color: d > 0 ? "var(--status-critical)" : "var(--status-good)" }}>{d > 0 ? "+" : "−"}{money(Math.abs(d))} ({d > 0 ? "+" : ""}{Math.round((d / c.amount) * 100)}%)</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === "rules" && (
        <div className={styles.cols2}>
          <Panel title="Spending rules" icon={ShieldCheck} sub="Checked automatically on every expense and purchase order">
            <div>
              {rules.map((r, i) => (
                <div key={r.name} className={ps.rule}>
                  <div><div className={ps.ruleName}>{r.name}</div><div className={ps.ruleText}>{r.text}</div></div>
                  <Switch checked={r.on} onCheckedChange={on => { setRules(rs => rs.map((x, j) => j === i ? { ...x, on } : x)); soon("Saving spending rules"); }} aria-label={r.name} />
                </div>
              ))}
            </div>
            <div><Button variant="outline" size="sm" onClick={() => soon("Adding spending rules")}><Plus className="h-4 w-4 mr-2" />Add rule</Button></div>
          </Panel>
          <Panel title="Approval limits" icon={ClipboardCheck} sub="Who can approve what">
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Branch manager</span><span className={styles.factValue}>Up to {money(2000)} per request</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Finance</span><span className={styles.factValue}>Up to {money(10000)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Owner</span><span className={styles.factValue}>Anything above {money(10000)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Alerts go to</span><span className={styles.factValue}>Budget owner, then the owner</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Budget year</span><span className={styles.factValue}>Follows Fiscal Periods</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Actuals from</span><span className={styles.factValue}>Posted expenses & bills</span></div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
